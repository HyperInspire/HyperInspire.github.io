"""Check links, assets, translations and inline examples after docs:build."""
import ast
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.images = []
        self.headings = []
        self.lang = None
        self.content_links = []
        self.content_depth = 0
        self.tabs = []
        self.docs_versions = []
        self.version_links = []
        self.feed(text)

    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "meta" and attrs.get("name") == "docs-version":
            self.docs_versions.append(attrs.get("content"))
        if tag == "a" and "data-docs-version" in attrs:
            self.version_links.append(attrs)
        if tag == "div" and ("vp-content" in attrs or self.content_depth):
            self.content_depth += 1
        if re.fullmatch(r"h[1-6]", tag) and "id" in attrs:
            self.headings.append((tag, attrs["id"]))
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if attrs.get("role") == "tab":
            self.tabs.append(attrs)
        if tag == "a" and "href" in attrs:
            self.links.append(attrs["href"])
            if self.content_depth:
                self.content_links.append(attrs["href"])
        if tag in ("img", "script") and "src" in attrs:
            self.links.append(attrs["src"])
        if tag == "link" and "href" in attrs:
            self.links.append(attrs["href"])
        if tag == "img":
            self.images.append(attrs)

    def handle_endtag(self, tag):
        if tag == "div" and self.content_depth:
            self.content_depth -= 1


def check_translations(root, pages, errors):
    docs = root / "docs"
    english = {p.relative_to(docs) for p in docs.rglob("*.md")
               if p.relative_to(docs).parts[0] not in (".vuepress", "zh")}
    chinese = {p.relative_to(docs / "zh") for p in (docs / "zh").rglob("*.md")}
    if english != chinese:
        errors.append(f"Translation page mismatch: missing {english - chinese}, extra {chinese - english}")
    paired_fences = 0
    for relative in sorted(english & chinese):
        en_text = (docs / relative).read_text()
        zh_text = (docs / "zh" / relative).read_text()
        # Keep commands and executable examples identical in both languages.
        en_code = re.findall(r"^```[^\n]*\n.*?^```", en_text, re.M | re.S)
        zh_code = re.findall(r"^```[^\n]*\n.*?^```", zh_text, re.M | re.S)
        if en_code != zh_code:
            errors.append(f"{relative}: translated code fences differ from English")
        en_tabs = re.findall(r"^@tab (.+)$", en_text, re.M)
        zh_tabs = re.findall(r"^@tab (.+)$", zh_text, re.M)
        if en_tabs != zh_tabs:
            errors.append(f"{relative}: API tab labels differ between languages")
        paired_fences += len(en_code)
        route = relative.with_name("index.html") if relative.name == "README.md" else relative.with_suffix(".html")
        en_page, zh_page = pages.get(route.as_posix()), pages.get("zh/" + route.as_posix())
        if en_page is None or zh_page is None:
            errors.append(f"{relative}: missing rendered language counterpart")
            continue
        if en_page.lang != "en-US" or zh_page.lang != "zh-CN":
            errors.append(f"{relative}: incorrect HTML language attributes")
        if en_page.headings != zh_page.headings:
            errors.append(f"{relative}: section anchors differ between languages")
        if [image.get("src") for image in en_page.images] != [image.get("src") for image in zh_page.images]:
            errors.append(f"{relative}: illustration sources differ between languages")
        if len(en_page.tabs) != len(en_tabs) or len(zh_page.tabs) != len(zh_tabs):
            errors.append(f"{relative}: Markdown tabs did not render as tab controls")
        # Shared downloads/images are valid; article navigation should stay Chinese.
        for href in zh_page.content_links:
            url = urlsplit(urljoin("https://docs.local/zh/" + route.as_posix(), href))
            target = unquote(url.path).lstrip("/")
            if not target or target.endswith("/"):
                target += "index.html"
            if url.netloc == "docs.local" and target in pages and not target.startswith("zh/"):
                errors.append(f"zh/{relative}: article link leaves Chinese: {href}")
    return len(english & chinese), paired_fences


def check_embedded_examples(root, errors):
    examples = root / "docs/.vuepress/public/examples"
    expected = {p.relative_to(examples).as_posix() for p in examples.rglob("*") if p.is_file()}
    checked = 0
    for path in (root / "docs").rglob("*.md"):
        if ".vuepress" in path.parts:
            continue
        complete_page = path.name == "examples.md"
        embedded = set()
        for summary, code in re.findall(
            r"<summary>([^<]+)</summary>\s*```[^\n]*\n(.*?)^```", path.read_text(), re.M | re.S
        ):
            name = re.split(r"\s+[—–]\s+", summary, maxsplit=1)[0]
            # Platform-specific CMake examples intentionally have different targets.
            if name not in expected or (name == "CMakeLists.txt" and not complete_page):
                continue
            embedded.add(name)
            if code.strip() != (examples / name).read_text().strip():
                errors.append(f"{path.relative_to(root)}: embedded {name} differs from the example file")
            checked += 1
        if complete_page and embedded != expected:
            errors.append(f"{path.relative_to(root)}: missing inline examples: {sorted(expected - embedded)}")
    return checked


def main():
    root = Path(__file__).resolve().parents[1]
    dist = root / "docs/.vuepress/dist"
    pages = {p.relative_to(dist).as_posix(): Page(p.read_text()) for p in dist.rglob("*.html")}
    errors = []
    package = json.loads((root / "package.json").read_text())
    lock = json.loads((root / "package-lock.json").read_text())
    if not re.fullmatch(r"\d+\.\d+\.\d+-d[1-9]\d*", package["version"]):
        errors.append("package.json: expected SDK_VERSION-dREVISION, for example 1.2.4-d2")
    if lock["version"] != package["version"] or lock["packages"][""]["version"] != package["version"]:
        errors.append("Documentation version differs between package.json and package-lock.json")
    version = package["version"].replace("-d", ".d")
    checked = 0
    for name, page in pages.items():
        if page.docs_versions != [version]:
            errors.append(f"{name}: missing or stale documentation version metadata")
        if name != "404.html":
            prefix = "/zh/" if name.startswith("zh/") else "/"
            if len(page.version_links) != 1 or any(
                link.get("data-docs-version") != version
                or link.get("href") != prefix + "introduction.html#documentation-version"
                for link in page.version_links
            ):
                errors.append(f"{name}: missing, stale or incorrectly localized version badge")
        for href in page.links:
            url = urlsplit(urljoin("https://docs.local/" + name, href))
            if url.netloc != "docs.local" or url.scheme not in ("http", "https"):
                continue
            target = unquote(url.path).lstrip("/")
            if not target or target.endswith("/"):
                target += "index.html"
            if not (dist / target).is_file():
                errors.append(f"{name}: missing {href}")
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(f"{name}: missing fragment {href}")
            checked += 1
        for attrs in page.images:
            if not attrs.get("alt", "").strip():
                errors.append(f"{name}: image has no alt text: {attrs.get('src')}")
        for attrs in page.tabs:
            if attrs.get("aria-controls") not in page.ids:
                errors.append(f"{name}: API tab has no matching panel")

    fences = 0
    for path in (root / "docs").rglob("*.md"):
        if ".vuepress" in path.parts:
            continue
        text = path.read_text()
        for code in re.findall(r"^```python\n(.*?)^```", text, re.M | re.S):
            try:
                ast.parse(code)
            except SyntaxError as error:
                errors.append(f"{path.relative_to(root)}: invalid Python fence: {error}")
            fences += 1
    for path in (root / "docs/.vuepress/public/examples").glob("*.py"):
        ast.parse(path.read_text(), filename=str(path))
    translations, paired_fences = check_translations(root, pages, errors)
    embedded_examples = check_embedded_examples(root, errors)
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"PASS: {len(pages)} HTML pages, {checked} local references, {fences} Python fences")
    print(f"PASS: {translations} English/Chinese page pairs, matching anchors and {paired_fences} shared code fences")
    print(f"PASS: documentation {version}, matching manifests, page metadata and localized version badges")
    print(f"PASS: {embedded_examples} inline examples match their complete source files")


if __name__ == "__main__":
    main()
