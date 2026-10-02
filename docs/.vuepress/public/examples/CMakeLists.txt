cmake_minimum_required(VERSION 3.20)
project(inspireface_examples LANGUAGES C CXX)

set(INSPIREFACE_ROOT "" CACHE PATH "SDK directory containing include/ and lib/")
if(WIN32)
    find_package(InspireFace CONFIG REQUIRED
        PATHS "${INSPIREFACE_ROOT}/lib/cmake/InspireFace" NO_DEFAULT_PATH)
    add_library(InspireFaceSDK ALIAS InspireFace::InspireFace)
else()
    find_path(ISF_INCLUDE_DIR inspireface.h PATHS "${INSPIREFACE_ROOT}/include" NO_DEFAULT_PATH REQUIRED)
    find_library(ISF_LIBRARY NAMES InspireFace PATHS "${INSPIREFACE_ROOT}/lib" NO_DEFAULT_PATH REQUIRED)
    add_library(InspireFaceSDK UNKNOWN IMPORTED)
    set_target_properties(InspireFaceSDK PROPERTIES
        IMPORTED_LOCATION "${ISF_LIBRARY}"
        INTERFACE_INCLUDE_DIRECTORIES "${ISF_INCLUDE_DIR}")
endif()

add_executable(detect_c detect.c)
target_compile_features(detect_c PRIVATE c_std_99)
set_target_properties(detect_c PROPERTIES LINKER_LANGUAGE CXX)
target_link_libraries(detect_c PRIVATE InspireFaceSDK)

option(BUILD_CPP_EXAMPLE "Build the C++ wrapper example (requires its headers)" OFF)
if(BUILD_CPP_EXAMPLE)
    add_executable(detect_cpp detect.cpp)
    target_compile_features(detect_cpp PRIVATE cxx_std_14)
    target_link_libraries(detect_cpp PRIVATE InspireFaceSDK)
endif()

if(WIN32)
    get_target_property(ISF_LIBRARY_TYPE InspireFaceSDK TYPE)
    if(ISF_LIBRARY_TYPE STREQUAL "SHARED_LIBRARY")
        foreach(example IN ITEMS detect_c detect_cpp)
            if(TARGET ${example})
                add_custom_command(TARGET ${example} POST_BUILD
                    COMMAND "${CMAKE_COMMAND}" -E copy_if_different
                        "$<TARGET_FILE:InspireFaceSDK>" "$<TARGET_FILE_DIR:${example}>"
                    VERBATIM)
            endif()
        endforeach()
    endif()
endif()
