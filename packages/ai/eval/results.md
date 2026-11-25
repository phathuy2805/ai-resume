# Báo cáo Đánh giá Độ chính xác Sàng lọc CV (`W2-AI-04`)

- **Thời điểm chạy:** 2026-11-25T02:08:41.019Z
- **Model Text:** `gemini-3.5-flash-lite`
- **Model Embedding:** `gemini-embedding-001`
- **Ngày tham chiếu kinh nghiệm:** `2026-11-01`
- **Bộ dữ liệu:** 40 cặp CV–JD (13 dev, 27 test) từ `packages/ai/fixtures/labels.csv`
- **Quy ước đánh giá 2 nhãn:** `score >= ngưỡng` → **phù hợp**; `score < ngưỡng` → **không phù hợp** (`CONSIDER` tính là không phù hợp).
- **Ngưỡng đề xuất cho `cvPassThreshold` mặc định:** **80** (chọn trên tập dev theo F1 cao nhất).

## 1. Chọn ngưỡng trên tập Dev (`50 / 60 / 70 / 80`)

| Ngưỡng | Accuracy | Precision | Recall | F1 | TP | FP | FN | TN | MAE | Chọn |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| 50 | 76.9% | 62.5% | 100.0% | **76.9%** | 5 | 3 | 0 | 5 | 6.15 |  |
| 60 | 76.9% | 62.5% | 100.0% | **76.9%** | 5 | 3 | 0 | 5 | 6.15 |  |
| 70 | 76.9% | 62.5% | 100.0% | **76.9%** | 5 | 3 | 0 | 5 | 6.15 |  |
| 80 | 92.3% | 100.0% | 80.0% | **88.9%** | 4 | 0 | 1 | 8 | 6.15 | **✓** |

## 2. Kết quả trên tập Test (ngưỡng = 80)

| Chỉ số | Giá trị |
| :--- | ---: |
| Số cặp đánh giá | 27 |
| Accuracy | **100.0%** |
| Precision | 100.0% |
| Recall | 100.0% |
| F1-Score | **100.0%** |
| Sai số điểm trung bình (MAE vs `expected_score`) | 8.30 điểm |

### Ma trận nhầm lẫn (Confusion Matrix — Tập Test)

| Thực tế \ Dự đoán | Phù hợp (`>= 80`) | Không phù hợp (`< 80`) |
| :--- | ---: | ---: |
| **Phù hợp** | TP = **10** | FN = **0** |
| **Không phù hợp** | FP = **0** | TN = **17** |

### Kết quả tập Test theo từng JD

| JD | Số cặp | Accuracy | Precision | Recall | F1 | TP / FP / FN / TN | MAE |
| :--- | ---: | ---: | ---: | ---: | ---: | :---: | ---: |
| JD_BE | 9 | 100.0% | 100.0% | 100.0% | 100.0% | 2 / 0 / 0 / 7 | 7.89 |
| JD_DA | 9 | 100.0% | 100.0% | 100.0% | 100.0% | 4 / 0 / 0 / 5 | 6.67 |
| JD_MKT | 9 | 100.0% | 100.0% | 100.0% | 100.0% | 4 / 0 / 0 / 5 | 10.33 |

## 3. Phân tích riêng nhóm độ chắc chắn (`confidence`)

| Nhóm | Số cặp | Accuracy | Precision | Recall | F1 | TP / FP / FN / TN | MAE |
| :--- | ---: | ---: | ---: | ---: | ---: | :---: | ---: |
| Tập Test — `chắc` | 22 | 100.0% | 100.0% | 100.0% | 100.0% | 8 / 0 / 0 / 14 | 7.73 |
| Tập Test — `chưa chắc` | 5 | 100.0% | 100.0% | 100.0% | 100.0% | 2 / 0 / 0 / 3 | 10.80 |
| Toàn bộ (Dev + Test) — `chưa chắc` | 9 | 88.9% | 100.0% | 66.7% | 80.0% | 2 / 0 / 1 / 6 | 9.56 |

## 4. Các ca AI chấm sai trên tập Test

Không có ca chấm sai nào trên tập Test ở ngưỡng đã chọn.

## 5. Độ ổn định (5 CV × 3 lần chạy, mục tiêu độ lệch ≤ ±5)

| CV | JD | Điểm 3 lần | Min | Max | Độ lệch lớn nhất | Đạt mục tiêu |
| :--- | :--- | :---: | ---: | ---: | ---: | :---: |
| `cv_be_01.pdf` | JD_BE | 96 / 96 / 96 | 96 | 96 | **0** | ✓ |
| `cv_be_05.pdf` | JD_BE | 75 / 74 / 75 | 74 | 75 | **1** | ✓ |
| `cv_da_01.pdf` | JD_DA | 95 / 94 / 92 | 92 | 95 | **3** | ✓ |
| `cv_da_06.pdf` | JD_DA | 86 / 84 / 84 | 84 | 86 | **2** | ✓ |
| `cv_mkt_01.pdf` | JD_MKT | 92 / 91 / 91 | 91 | 92 | **1** | ✓ |

- **Độ lệch lớn nhất toàn bộ 5 CV:** **3** điểm (Đạt mục tiêu ≤ ±5).

## 6. Thời gian xử lý & Token trung bình mỗi CV

| Chỉ số (trung bình trên 40 cặp) | Giá trị |
| :--- | ---: |
| Tổng thời gian `screenCv` | **44925 ms** (~44.92s) |
| — Bước `parseCv` | 17556 ms |
| — Bước `embedCv` | 498 ms |
| — Bước `scoreCv` | 7623 ms |
| — Bước `explainScore` | 19248 ms |
| Input tokens trung bình (các lần gọi LLM) | 2613 |
| Output tokens trung bình (các lần gọi LLM) | 774 |
| **Tổng tokens trung bình mỗi CV** | **3387** |

*(Lưu ý: Gemini Developer API không trả `tokenCount` cho lời gọi embedding nên tổng token phản ánh các lời gọi LLM `parseCv`, `scoreCv/relevance` và `explainScore`.)*

## 7. Hạn chế của phép đánh giá

1. **Nhãn do 1 người gán:** Bộ nhãn chuẩn (`labels.csv`) được gán bởi một người, chưa có quy trình gán nhãn độc lập 2 người (double-blind) hay chỉ số đồng thuận liên người gán (Cohen’s kappa), đặc biệt với nhóm hồ sơ ranh giới (`chưa chắc`).
2. **Bộ dữ liệu nhỏ (30 CV / 40 cặp CV–JD):** Kích thước tập dev (13 cặp) và tập test (27 cặp) còn nhỏ, mỗi ca sai làm dịch chuyển đáng kể tỷ lệ phần trăm Accuracy/F1.
3. **CV là dữ liệu giả lập (synthetic fixtures):** Toàn bộ 30 CV được sinh từ mẫu dữ liệu giả có bố cục sạch, chưa phản ánh đầy đủ độ nhiễu, định dạng phức tạp hoặc lỗi OCR của CV thực tế ngoài thị trường.

