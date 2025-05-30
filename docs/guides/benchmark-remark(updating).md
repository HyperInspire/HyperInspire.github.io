# Benchmark Remark(Updating)

The benchmark tests will be continuously updated.

::: tip
All benchmark tests are conducted using **real machine equipment**. Due to various reasons, the results of each test device may slightly deviate
:::

## Pikachu_Apple(ANE, Apple Neural Engine)

### Device: Mac mini 2023 , Apple M2[FP32]
| **Benchmark**   | **Loops** | **Total Time** | **Average Time** |
| --------------- | --------- | -------------- | ---------------- |
| Face Detect@160 | 1000      | 553 ms         | **0.53 ms**      |
| Face Detect@320 | 1000      | 1635ms         | **1.64ms**       |
| Face Detect@640 | 1000      | 5903ms         | **5.90ms**       |
| Face Comparison | 1000      | 1ms            | **0.001ms**      |

**Note**: The above data inference backend uses CoreML.


## Megatron_Apple(ANE, Apple Neural Engine)

### Device: iPhone13, Apple A15[FP32]
| **Benchmark**          | **Loops** | **Total Time** | **Average Time** |
| ---------------------- | --------- | -------------- | ---------------- |
| Face Detect@160        | 1000      | 711 ms         | **0.71 ms**      |
| Face Detect@192        | 1000      | 832ms          | **0.83ms**       |
| Face Detect@256        | 1000      | 931ms          | **0.92ms**       |
| Face Detect@320        | 1000      | 1324ms         | **1.32ms**       |
| Face Detect@640        | 1000      | 3881ms         | **3.88ms**       |
| Face Extract(**MNet**) | 1000      | 853ms          | **0.85ms**       |
| Face Extract(**R50**)  | 1000      | 3856ms         | **3.86ms**       |

### Device: Mac mini 2023 , Apple M2[FP32]
| **Benchmark**          | **Loops** | **Total Time** | **Average Time** |
| ---------------------- | --------- | -------------- | ---------------- |
| Face Detect@160        | 1000      | 414 ms         | **0.45 ms**      |
| Face Detect@192        | 1000      | 574ms          | **0.57ms**       |
| Face Detect@256        | 1000      | 769ms          | **0.77ms**       |
| Face Detect@320        | 1000      | 1073ms         | **1.07ms**       |
| Face Detect@640        | 1000      | 3743ms         | **3.74ms**       |
| Face Extract(**MNet**) | 1000      | 573ms          | **0.57ms**       |
| Face Extract(**R50**)  | 1000      | 3527ms         | **3.53ms**       |

**Note**: The above data inference backend uses CoreML.

## Pikachu(CPU)
### Device: Macbook pro 16-inch, 2019 2.6 GHz Intel Core i7[FP32]
| **Benchmark** | **Loops** | **Total Time** | **Average Time** |
| --- | --- | --- | --- |
| Face Detect@160          | 1000      | 4170.91578 ms  | **4.1709 ms**    |
| Face Detect@320          | 1000      | 8493.06583 ms  | **8.4893 ms**    |
| Face Detect@640          | 1000      | 25808.39749 ms | **25.808 ms**    |
| Face Light-Track | 1000 | 1957.73 ms | **1.9577 ms** |
| Face alignment & Extract | 1000 | 6139.67 ms | **6.1397 ms** |
| Face Comparison | 1000 | 0.24ms  | **0.0002ms** |
| Search Face from 1k | 1000 | 72.39ms | **0.07ms** |
| Search Face from 5k | 1000 | 364.21ms | **0.36ms** |
| Search Face from 10k | 1000 | 1193.26ms | **1.19ms** |

## Gundam_RV1109(RKNPU)
### Device: RV1126[INT8]
| **Benchmark** | **Loops** | **Total Time** | **Average Time** |
| --- | --- | --- | --- |
| Face Detect@160          | 1000      | 17342.88616ms  | **17.34289ms**   |
| Face Detect@320          | 1000      | 22638.11865ms  | **22.63812ms**   |
| Face Detect@640          | 1000      | 39745.28562ms  | **39.74529ms**   |
| Face Light-Track | 1000 | 8858.03802ms | **8.85804ms** |
| Face alignment & Extract | 1000 | 42352.03367ms | **42.35203ms** |
| Face Comparison | 1000 | 1.30754ms  | **0.00131ms** |
| Search Face from 1k | 1000 | 3198.13874ms | **3.19814ms** |
| Search Face from 5k | 1000 | 15745.00533ms | **15.74501ms** |
| Search Face from 10k | 1000 | 31267.2301ms | **31.26723ms** |

## Gundam_RV1106(RKNPU2)
### Device: RV1106[INT8]
| **Benchmark** | **Loops** | **Total Time** | **Average Time** |
| --- | --- | --- | --- |
| Face Detect@160          | 1000      | 23776ms         | **23.78ms**      |
| Face Detect@320          | 1000      | 33310ms         | **33.31ms**      |
| Face Detect@640          | 1000      | 58631ms         | **58.63ms**      |
| Face Light-Track         | 1000      | 15642ms         | **15.64ms**      |
| Face alignment & Extract | 1000      | 15178ms         | **15.18ms**      |
| Face Comparison          | 1000      | 23ms          | **0.023us**      |

## Gundam_RK356X(RKNPU2)
### Device: RK3568[INT8]
| **Benchmark** | **Loops** | **Total Time** | **Average Time** |
| --- | --- | --- | --- |
| Face Detect@160          | 1000      | 16946ms         | **16.95ms**      |
| Face Detect@320          | 1000      | 25108ms         | **25.11ms**      |
| Face Detect@640          | 1000      | 68778ms         | **68.78ms**      |
| Face Light-Track         | 1000      | 11215ms         | **11.22ms**      |
| Face alignment & Extract | 1000      | 9070ms          | **9.07ms**       |
| Face Comparison          | 1000      | 9ms           | **0.009ms**      |

## Megatron_TRT(CUDA)
### Device: NVIDIA RTX3060 12G[FP16]
| **Benchmark** | **Loops** | **Total Time** | **Average Time** |
| --- | --- | --- | --- |
| Face Detect@160          | 1000      | 911ms           | **0.91ms**      |
| Face Detect@320          | 1000      | 2374ms          | **2.37ms**      |
| Face Detect@640          | 1000      | 8685ms          | **8.685ms**      |
| Face Light-Track         | 1000      | 621ms           | **0.62ms**      |
| Face alignment & Extract | 1000      | 1009ms          | **1.01ms**       |
| Face Comparison          | 1000      | 1ms           | **0.001ms**      |

**Note**: The test results are all calculated by the test programs in the '**cpp/test**' subproject.
