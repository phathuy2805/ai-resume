# HireFlow AI Fixtures & Ground Truth Dataset

Bộ dữ liệu kiểm thử chuẩn (Ground Truth) phục vụ đo lường độ chính xác sàng lọc hồ sơ CV bằng AI (`W1-AI-03`, `W1-AI-04`, `W1-AI-05` và `W2-AI-04`).

---

## 1. Cấu trúc thư mục

```text
packages/ai/fixtures/
├── jds/
│   ├── jd_be.json                       # Chi tiết JD Backend (NodeJS / NestJS)
│   ├── jd_da.json                       # Chi tiết JD Data Analyst (SQL / Python / BI)
│   ├── jd_mkt.json                      # Chi tiết JD Digital Marketing Specialist
│   └── jds_seed.json                    # Dữ liệu 3 JD để tích hợp seed ở W1-BE-01
│
├── cvs/
│   ├── cv_be_01.pdf ... cv_be_10.pdf    # 10 CV ứng tuyển vị trí Backend
│   ├── cv_da_01.pdf ... cv_da_10.pdf    # 10 CV ứng tuyển vị trí Data Analyst
│   ├── cv_mkt_01.pdf ... cv_mkt_10.pdf  # 10 CV ứng tuyển vị trí Digital Marketing
│   └── scans/
│       ├── cv_scan_01.pdf               # CV ảnh scan photocopy (lỗi text stream rỗng)
│       └── cv_scan_02.pdf               # CV ảnh chụp điện thoại (lỗi text stream rỗng)
│
├── labels.csv                           # Bộ nhãn chuẩn (40 dòng: 30 mục tiêu + 10 chéo)
└── README.md                            # Tài liệu đặc tả bộ dữ liệu và quy tắc sử dụng
```

---

## 2. Danh mục Vị trí Tuyển dụng (Job Descriptions)

| Mã JD | Tiêu đề vị trí | Phòng ban | Kinh nghiệm | Kỹ năng bắt buộc (`requiredSkills`) | Ngưỡng điểm |
|:---|:---|:---|:---:|:---|:---:|
| **`JD_BE`** | Senior Backend NodeJS / NestJS Developer | Engineering | $\ge 3$ năm | `NodeJS`, `NestJS`, `TypeScript`, `PostgreSQL`, `RESTful API`, `Docker` | 70/100 |
| **`JD_DA`** | Middle / Senior Data Analyst | Data & Analytics | $\ge 2$ năm | `SQL`, `Python`, `PowerBI`, `Data Analysis`, `Statistics` | 70/100 |
| **`JD_MKT`** | Digital Marketing Specialist | Growth & Marketing | $\ge 2$ năm | `SEO`, `Google Ads`, `Meta Ads`, `Content Marketing`, `Google Analytics` | 70/100 |

> 💡 File **`packages/ai/fixtures/jds/jds_seed.json`** chứa 3 JD có các trường đầu vào phù hợp `CreateJobSchema` hiện tại. W1-BE-01 cần đối chiếu với schema Prisma, bổ sung quan hệ người tạo nếu bắt buộc và kiểm thử seed trước khi xác nhận nạp trực tiếp được vào database. Mã `JD_BE` / `JD_DA` / `JD_MKT` trong CSV được ánh xạ sang UUID bằng trường `code` và `id` trong từng file JD.

---

## 3. Đặc tả Bộ dữ liệu CV Giả lập (30 CVs + 2 Scans)

Mỗi vị trí tuyển dụng gồm **10 CV giả lập** được thiết kế chân thực, không chứa bất kỳ câu văn tự phủ định hoặc so sánh với JD để đảm bảo tính khách quan khi AI sàng lọc:

**Ngày đánh giá cố định: `2026-11-01` (01/11/2026, DD/MM/YYYY).** Mọi mốc `Present` / `Hiện tại` được hiểu tại ngày này, kể cả khi chạy đánh giá vào ngày khác. Ngày tham chiếu được in trên cả 30 CV và 2 scan. Khi tính số tháng, tháng bắt đầu được tính từ ngày 01; tháng kết thúc ghi cụ thể được tính hết tháng đó, còn `Hiện tại` kết thúc tại đầu ngày 01/11/2026. Các giai đoạn liên tiếp không được cộng trùng. Không dùng ngày hệ thống để tự thay đổi tuổi nghề của fixture.

1. **4 CV Phù hợp rõ (Qualified - `cv_01` đến `cv_04`):**
   - Đạt hoặc vượt số năm kinh nghiệm yêu cầu.
   - Nắm vững toàn bộ kỹ năng bắt buộc và nhiều kỹ năng ưu tiên.
   - Nhãn: `phù hợp`, độ tin cậy: `chắc`, điểm kỳ vọng: **$86 - 96$**.
2. **3 CV Khó / Cận biên (Borderline - `cv_05` đến `cv_07`):**
   - **`cv_05` (Không phù hợp):** Đầy đủ kinh nghiệm và kỹ năng khác nhưng **thiếu đúng 1 kỹ năng cốt lõi bắt buộc** (BE thiếu `NestJS`; DA thiếu `Python`; MKT thiếu `Google Ads`). Điểm kỳ vọng: **$65 - 66$**, nhãn: `không phù hợp`, `confidence = chưa chắc`.
   - **`cv_06` (Phù hợp):** Đầy đủ toàn bộ kỹ năng chuyên môn và **kinh nghiệm thực tế vừa chạm ngưỡng tối thiểu** (BE đạt 3 năm 2 tháng / yêu cầu $\ge 3$ năm; DA đạt 2 năm 3 tháng / yêu cầu $\ge 2$ năm; MKT đạt 2 năm 2 tháng / yêu cầu $\ge 2$ năm). Điểm kỳ vọng: **$74 - 75$**, nhãn: `phù hợp`, `confidence = chưa chắc`.
   - **`cv_07` (Không phù hợp):** Ứng viên từ ngành/stack gần chuyển sang (C#/.NET sang NodeJS/TypeScript; BA sang Data Analyst; PR sang Digital Marketing), đã tiếp cận nhưng chưa đủ độ sâu các kỹ năng bắt buộc. Điểm kỳ vọng: **$58 - 62$**, nhãn: `không phù hợp`, `confidence = chưa chắc`.
3. **3 CV Không phù hợp rõ (Rejected - `cv_08` đến `cv_10`):**
   - Hoàn toàn lệch ngành (Junior Frontend, Hành chính Nhân sự, Thiết kế đồ họa, Kỹ sư nhúng, Kế toán, Chăm sóc khách hàng...).
   - Thiếu toàn bộ hoặc phần lớn kỹ năng bắt buộc.
   - Nhãn: `không phù hợp`, độ tin cậy: `chắc`, điểm kỳ vọng: **$5 - 20$**.

### Đa dạng định dạng & An toàn dữ liệu
- **Bố cục:** 12 CV thiết kế 2 cột (`2-col`) và 18 CV thiết kế 1 cột (`1-col`) (đáp ứng tiêu chí tối thiểu $\ge 8$ CV 2 cột).
- **Ngôn ngữ:** 12 CV trình bày bằng Tiếng Anh (`EN`) và 18 CV bằng Tiếng Việt (`VI`) (đáp ứng tiêu chí tối thiểu $\ge 8$ CV Tiếng Anh).
- **2 CV dạng ảnh scan (`cv_scan_01.pdf`, `cv_scan_02.pdf`):** Đóng gói dạng ảnh raster (không có text layer) nhằm thử nghiệm nhánh bắt lỗi của module đọc văn bản PDF (`unpdf` ở `W1-AI-03`). Hai file này không tính vào tập đánh giá độ chính xác.
- **Dữ liệu liên hệ & Gửi mail demo:**
  - Email của cả 30 CV và 2 scan chỉ dùng `@example.com`, tên miền ví dụ được dành riêng theo [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606.html#section-3).
  - Số điện thoại dùng mẫu placeholder `0900 000 xxx` / `+84 900 000 xxx` (001 đến 032) theo quy ước của bộ dữ liệu; không xem mẫu này là bằng chứng số không thuộc thuê bao thật.
  - Hồ sơ được tổng hợp để kiểm thử; tên công ty, trường học có thể trùng tổ chức thật và không xác nhận quan hệ lao động/học tập của cá nhân nào.
  - Khi triển khai demo gửi email ở W3-BE-07, dùng chế độ giả lập gửi hoặc danh sách người nhận kiểm thử được cho phép; không dùng fixture làm bảo đảm duy nhất để chặn gửi email, SMS hoặc gọi điện ra ngoài. Cơ chế này cần được triển khai ở tính năng gửi, chưa được cung cấp bởi bộ fixtures.

---

## 4. Đặc tả Bảng Nhãn `labels.csv` (Ground Truth)

File `labels.csv` gồm đúng **40 dòng dữ liệu** (30 cặp mục tiêu + 10 cặp chéo) với 8 cột chuẩn hóa:

| Cột | Kiểu | Mô tả & Quy ước giá trị |
|:---|:---:|:---|
| `cv_file` | `string` | Tên tệp PDF (VD: `cv_be_01.pdf`). |
| `jd_id` | `string` | Mã vị trí tuyển dụng đối chiếu (`JD_BE`, `JD_DA`, `JD_MKT`). |
| `label` | `enum` | Nhãn kết quả sàng lọc: `phù hợp` hoặc `không phù hợp`. |
| `reason` | `string` | Lý do cô đọng 1 câu giải thích quyết định. |
| `missing_skills` | `string` | Kỹ năng bắt buộc chưa có bằng chứng trong CV — **bắt buộc trùng khớp chính xác với tên trong `requiredSkills` của JD**, ngăn cách bằng `;` (để trống nếu đã có đủ bằng chứng). Không đưa số năm kinh nghiệm vào cột này. |
| `confidence` | `enum` | Mức độ tự tin của nhãn: `chắc` (với ca rõ ràng) hoặc `chưa chắc` (dành riêng cho 9 ca khó/borderline). |
| `split` | `enum` | Phân vùng dữ liệu: `dev` (tinh chỉnh) hoặc `test` (đánh giá độc lập). |
| `expected_score` | `number` | Điểm số kỳ vọng theo thang 0 – 100 (phục vụ đối soát tương quan điểm AI). |

### Quy tắc đối chiếu kỹ năng
- Đánh giá bằng chứng từ toàn bộ CV (kỹ năng, mô tả công việc, dự án), không chỉ dò tên trong mục Skills; việc không thấy bằng chứng không khẳng định ứng viên ngoài đời không biết kỹ năng đó.
- Chấp nhận tên tương đương có ngữ cảnh: `Node.js` → `NodeJS`, `Power BI` → `PowerBI`, `GA4` → `Google Analytics`, triển khai/tích hợp `REST API` → `RESTful API`, truy vấn SQL trên PostgreSQL → `SQL`. Chỉ có `SQL` chung chung không đủ chứng minh đã dùng `PostgreSQL`.
- Phân tích hiệu quả chiến dịch và ROI bằng Google Analytics là bằng chứng cho `Data Analysis`, nhưng không tự chứng minh `Statistics`, `SQL`, `Python` hoặc `PowerBI`. Kỹ năng ghi ở mức cơ bản được tính là có bằng chứng; độ sâu được đánh giá trong `reason` và điểm.
- Nhóm `_05` thiếu đúng một kỹ năng: BE thiếu `NestJS`, DA thiếu `Python` (đã có thống kê bằng SQL/Excel), MKT thiếu `Google Ads` (đã có SEO).

### 10 Cặp Đánh giá Chéo (Cross-matching Pairs)
Để thử nghiệm độ nhạy từ chối khi hồ sơ lệch ngành hoàn toàn, 10 cặp ghép chéo giữa các CV và JD khác nhau đã được bổ sung vào `labels.csv`:
* `cv_be_02.pdf` $\times$ `JD_DA`, `cv_be_03.pdf` $\times$ `JD_DA`
* `cv_be_01.pdf` $\times$ `JD_MKT`, `cv_be_04.pdf` $\times$ `JD_MKT`
* `cv_da_03.pdf` $\times$ `JD_BE`, `cv_da_04.pdf` $\times$ `JD_BE`
* `cv_da_02.pdf` $\times$ `JD_MKT`, `cv_mkt_04.pdf` $\times$ `JD_DA`
* `cv_mkt_02.pdf` $\times$ `JD_BE`, `cv_mkt_03.pdf` $\times$ `JD_BE`
*(Tất cả 10 cặp chéo đều có nhãn `không phù hợp`, độ tin cậy `chắc`, điểm kỳ vọng $\le 22$).*

---

## 5. Quy tắc Phân chia Tập dữ liệu (Dev / Test Split)

Tổng cộng 40 cặp đánh giá được phân bổ theo tỷ lệ chuẩn **1/3 Dev – 2/3 Test**:

* **Tập `dev` (13 cặp – 32.5%):**
  - Gồm 11 cặp mục tiêu (đủ Qualified, Borderline, Rejected cho cả 3 JD) + 2 cặp chéo.
  - Nhóm Borderline có 1 ca `phù hợp` (`cv_be_06`) và 3 ca `không phù hợp`.
  - **Mục đích:** Dành riêng cho kỹ sư AI tinh chỉnh system instruction, few-shot prompts và tối ưu ngưỡng chấm điểm trong tuần 1 (`W1-AI-03`, `W1-AI-04`, `W1-AI-05`).
* **Tập `test` (27 cặp – 67.5%):**
  - Gồm 19 cặp mục tiêu + 8 cặp chéo; vẫn đủ Qualified, Borderline, Rejected cho cả 3 JD.
  - Nhóm Borderline có 2 ca `phù hợp` (`cv_da_06`, `cv_mkt_06`) và 3 ca `không phù hợp` để kiểm tra cả lỗi loại nhầm và nhận nhầm.
  - **Mục đích:** Dành riêng cho báo cáo độc lập độ chính xác sàng lọc (Accuracy, Precision, Recall, F1-Score) ở `W2-AI-04`.
  - ⚠️ **QUY TẮC BẤT BIẾN:** Tuyệt đối **KHÔNG** sử dụng tập `test` trong quá trình tinh chỉnh prompt để ngăn ngừa triệt để hiện tượng rò rỉ dữ liệu (*Data Leakage*) và học vẹt (*Overfitting*).

**Tách theo CV:** Mọi cặp có cùng `cv_file` phải ở cùng một split, kể cả cặp chéo. Giao của hai tập tên CV dev/test phải rỗng. Nếu thay đổi split hoặc nội dung fixture, cần ghi nhận phiên bản commit và không so trực tiếp kết quả giữa hai phiên bản như cùng một benchmark. Nếu tập test cũ đã được dùng để chỉnh prompt, việc sửa split không xóa được sự tiếp xúc trước đó; cần tập test mới để đánh giá độc lập.

### Sinh lại và kiểm tra
Chạy từ thư mục gốc repo:

```sh
node packages/ai/scripts/generate-fixtures.mjs
```

Script dùng `pdfkit` từ devDependencies, font Arial tại `C:/Windows/Fonts`, cùng Python có Pillow để tạo scan. Có thể đặt biến môi trường `PYTHON` trỏ tới Python cần dùng. Sau khi sinh lại, kiểm tra: đủ 30 PDF có text và 2 PDF chỉ có ảnh; dữ liệu trích xuất khớp script; 12 CV hai cột và 12 CV tiếng Anh; 40 cặp/8 cột hợp lệ; 13 dev/27 test không trùng CV; 9 ca khó gồm 3 phù hợp và 6 không phù hợp; kỹ năng đúng JD; mốc thời gian khớp ngày tham chiếu; email chỉ dùng `example.com`; không có câu tự lộ nhãn trong CV. Nhãn và split được quản lý trong CSV, script không tự ghi đè chúng.

---

## 6. Hạn chế của Bộ dữ liệu (Limitation Notice)

> ⚠️ **LƯU Ý QUAN TRỌNG KHI ĐỌC BÁO CÁO Ở W2-AI-04:**
>
> Toàn bộ nhãn trong `labels.csv` được xây dựng và rà soát bởi **một chuyên viên duy nhất (Tài)**. Do giới hạn về thời gian và nguồn lực tuần 1, dự án **chưa tiến hành đo lường chỉ số đồng thuận giữa nhiều người đánh giá (Inter-annotator Agreement)** thông qua các hệ số như *Cohen's Kappa* hoặc *Fleiss' Kappa*.
>
> Vì vậy, các báo cáo độ chính xác của pipeline AI ở `W2-AI-04` cần được diễn giải và đối chiếu đi kèm với hạn chế mang tính chủ quan của người gán nhãn, đặc biệt là ở nhóm hồ sơ cận biên (`confidence = chưa chắc`).
