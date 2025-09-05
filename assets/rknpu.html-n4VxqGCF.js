import{_ as s,c as a,d as e,o as i}from"./app-anolQzaq.js";const l={};function t(c,n){return i(),a("div",null,n[0]||(n[0]=[e(`<h1 id="using-inspireface-in-rockchip-npu" tabindex="-1"><a class="header-anchor" href="#using-inspireface-in-rockchip-npu"><span>Using InspireFace in Rockchip NPU</span></a></h1><h2 id="how-to-use-the-sdk" tabindex="-1"><a class="header-anchor" href="#how-to-use-the-sdk"><span>How to Use the SDK</span></a></h2><p>InspireFace-SDK already supports Rockchip&#39;s RKNPU and RGA technologies. Most of the basic interfaces of all InspireFace libraries are consistent with no differences, so you can refer to C/C++ and other related usage cases to quickly get started with the RK device-optimized version.</p><h2 id="api-differences" tabindex="-1"><a class="header-anchor" href="#api-differences"><span>API Differences</span></a></h2><p>We provide several dedicated APIs for the RK version:</p><h3 id="rga-related" tabindex="-1"><a class="header-anchor" href="#rga-related"><span>RGA Related</span></a></h3><p>RKRGA is an image processing acceleration engine provided by RK devices, which can provide acceleration for 2D image transformation processing using hardware advantages. We provide a series of interfaces for configuring RGA.</p><div class="language-c line-numbers-mode" data-highlighter="prismjs" data-ext="c"><pre><code><span class="line"><span class="token comment">/**</span>
<span class="line"> * @brief Check whether RGA is enabled during compilation</span>
<span class="line"> * @param status Pointer to the status variable that will be returned.</span>
<span class="line"> * @return HResult indicating the success or failure of the operation.</span>
<span class="line"> * */</span></span>
<span class="line">HYPER_CAPI_EXPORT <span class="token keyword">extern</span> HResult <span class="token function">HFQueryExpansiveHardwareRGACompileOption</span><span class="token punctuation">(</span>HPInt32 enable<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">/**</span>
<span class="line"> * @brief Set the rockchip dma heap path</span>
<span class="line"> * By default, we have already configured the DMA Heap address used by RGA on RK devices.</span>
<span class="line"> * If you wish to customize this address, you can modify it through this API.</span>
<span class="line"> * @param path The path to the rockchip dma heap</span>
<span class="line"> * @return HResult indicating the success or failure of the operation.</span>
<span class="line"> * */</span></span>
<span class="line">HYPER_CAPI_EXPORT <span class="token keyword">extern</span> HResult <span class="token function">HFSetExpansiveHardwareRockchipDmaHeapPath</span><span class="token punctuation">(</span>HPath path<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">/**</span>
<span class="line"> * @brief Query the rockchip dma heap path</span>
<span class="line"> * @param path Pointer to a pre-allocated character array that will store the returned path.</span>
<span class="line"> * The array should be at least 256 bytes in size.</span>
<span class="line"> * @return HResult indicating the success or failure of the operation.</span>
<span class="line"> * */</span></span>
<span class="line">HYPER_CAPI_EXPORT <span class="token keyword">extern</span> HResult <span class="token function">HFQueryExpansiveHardwareRockchipDmaHeapPath</span><span class="token punctuation">(</span>HString path<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">/**</span>
<span class="line"> * @brief Enum for image processing backend.</span>
<span class="line"> */</span></span>
<span class="line"><span class="token keyword">typedef</span> <span class="token keyword">enum</span> <span class="token class-name">HFImageProcessingBackend</span> <span class="token punctuation">{</span></span>
<span class="line">    HF_IMAGE_PROCESSING_CPU <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">,</span>  <span class="token comment">///&lt; CPU backend(Default)</span></span>
<span class="line">    HF_IMAGE_PROCESSING_RGA <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">,</span>  <span class="token comment">///&lt; Rockchip RGA backend(Hardware support is mandatory)</span></span>
<span class="line"><span class="token punctuation">}</span> HFImageProcessingBackend<span class="token punctuation">;</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">/**</span>
<span class="line"> * @brief Switch the image processing backend, must be called before HFCreateInspireFaceSession.</span>
<span class="line"> * @param backend The image processing backend to be set.</span>
<span class="line"> * @return HResult indicating the success or failure of the operation.</span>
<span class="line"> * */</span></span>
<span class="line">HYPER_CAPI_EXPORT <span class="token keyword">extern</span> HResult <span class="token function">HFSwitchImageProcessingBackend</span><span class="token punctuation">(</span>HFImageProcessingBackend backend<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">/**</span>
<span class="line"> * @brief Set the image process aligned width, must be called before HFCreateInspireFaceSession.</span>
<span class="line"> * @param width The image process aligned width to be set.</span>
<span class="line"> * @return HResult indicating the success or failure of the operation.</span>
<span class="line"> * */</span></span>
<span class="line">HYPER_CAPI_EXPORT <span class="token keyword">extern</span> HResult <span class="token function">HFSetImageProcessAlignedWidth</span><span class="token punctuation">(</span>HInt32 width<span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,8)]))}const r=s(l,[["render",t]]),o=JSON.parse('{"path":"/using-with/rknpu.html","title":"Using InspireFace in Rockchip NPU","lang":"en-US","frontmatter":{},"headers":[{"level":2,"title":"How to Use the SDK","slug":"how-to-use-the-sdk","link":"#how-to-use-the-sdk","children":[]},{"level":2,"title":"API Differences","slug":"api-differences","link":"#api-differences","children":[{"level":3,"title":"RGA Related","slug":"rga-related","link":"#rga-related","children":[]}]}],"git":{"updatedTime":1757032138000,"contributors":[{"name":"tunm","username":"tunm","email":"tunmxy@163.com","commits":2,"url":"https://github.com/tunm"}],"changelog":[{"hash":"0c3a33e54789490cd1928f9755992c82bfec6de9","time":1757032138000,"email":"tunmxy@163.com","author":"tunm","message":"RK"},{"hash":"36283da830e3e7efee25add2666d4a49dae22fa8","time":1744178190000,"email":"tunmxy@163.com","author":"tunm","message":"Update"}]},"filePathRelative":"using-with/rknpu.md"}');export{r as comp,o as data};
