cmake_minimum_required(VERSION 3.20)
project(inspireface_examples LANGUAGES C CXX)

set(INSPIREFACE_ROOT "" CACHE PATH "SDK directory containing include/ and lib/")
find_path(ISF_INCLUDE_DIR inspireface.h PATHS "${INSPIREFACE_ROOT}/include" NO_DEFAULT_PATH REQUIRED)
find_library(ISF_LIBRARY NAMES InspireFace PATHS "${INSPIREFACE_ROOT}/lib" NO_DEFAULT_PATH REQUIRED)
add_library(InspireFaceSDK UNKNOWN IMPORTED)
set_target_properties(InspireFaceSDK PROPERTIES
    IMPORTED_LOCATION "${ISF_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${ISF_INCLUDE_DIR}")

add_executable(detect_c detect.c)
target_compile_features(detect_c PRIVATE c_std_99)
target_link_libraries(detect_c PRIVATE InspireFaceSDK)

option(BUILD_CPP_EXAMPLE "Build the C++ wrapper example (requires its headers)" OFF)
if(BUILD_CPP_EXAMPLE)
    add_executable(detect_cpp detect.cpp)
    target_compile_features(detect_cpp PRIVATE cxx_std_14)
    target_link_libraries(detect_cpp PRIVATE InspireFaceSDK)
endif()
