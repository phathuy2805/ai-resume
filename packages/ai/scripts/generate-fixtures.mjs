import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const fixturesDir = path.join(rootDir, 'fixtures');
const cvsDir = path.join(fixturesDir, 'cvs');
const scansDir = path.join(cvsDir, 'scans');

fs.mkdirSync(cvsDir, { recursive: true });
fs.mkdirSync(scansDir, { recursive: true });

const fontRegular = 'C:/Windows/Fonts/arial.ttf';
const fontBold = 'C:/Windows/Fonts/arialbd.ttf';

// Danh sách 30 CV chi tiết
const cvList = [
  // ==========================================
  // 10 CV CHO JD_BE (NodeJS / NestJS Developer)
  // ==========================================
  {
    fileName: 'cv_be_01.pdf',
    jdId: 'JD_BE',
    category: 'QUALIFIED',
    layout: '2-col',
    language: 'EN',
    fullName: 'Nguyen Minh Triet',
    title: 'Senior Backend Engineer (NodeJS / NestJS)',
    contact: { email: 'triet.nguyen.dev@gmail.com', phone: '+84 912 345 678', location: 'Ho Chi Minh City, Vietnam', github: 'github.com/trietnguyen-dev' },
    summary: 'Senior Backend Engineer with 4.5 years of hands-on experience designing and building scalable microservices and RESTful APIs using TypeScript, NodeJS, and NestJS. Proven track record of optimizing PostgreSQL database queries and implementing asynchronous messaging queues with BullMQ and Redis in Dockerized environments.',
    skills: ['NodeJS', 'NestJS', 'TypeScript', 'PostgreSQL', 'Docker', 'RESTful API', 'Redis', 'BullMQ', 'AWS S3', 'Git', 'Microservices', 'Jest'],
    experience: [
      {
        role: 'Senior Backend Developer',
        company: 'Veloce Tech Solutions',
        period: '2023 - Present (2 years)',
        bullets: [
          'Architected and implemented 15+ core RESTful microservices using NestJS and TypeScript for an enterprise recruitment platform handling 100k daily active users.',
          'Designed PostgreSQL schema, optimized complex relational queries, and reduced query latency by 45% using efficient indexing and connection pooling.',
          'Integrated BullMQ with Redis to process asynchronous PDF resume parsing and AI text screening pipelines without blocking event loops.'
        ]
      },
      {
        role: 'Backend Developer',
        company: 'Fintech Nexus Vietnam',
        period: '2021 - 2023 (2.5 years)',
        bullets: [
          'Developed robust payment processing APIs using NodeJS, Express, and PostgreSQL.',
          'Containerized backend services with Docker and Docker Compose for automated CI/CD deployments on AWS.',
          'Implemented unit and integration tests using Jest, achieving 85% test coverage across financial transaction services.'
        ]
      }
    ],
    education: { degree: 'B.S. in Computer Science', school: 'Ho Chi Minh City University of Technology (HCMUT)', year: '2017 - 2021' },
    certifications: ['AWS Certified Solutions Architect – Associate (2023)']
  },
  {
    fileName: 'cv_be_02.pdf',
    jdId: 'JD_BE',
    category: 'QUALIFIED',
    layout: '1-col',
    language: 'EN',
    fullName: 'Le Hoang Nam',
    title: 'Lead Backend Developer / Software Architect',
    contact: { email: 'nam.lehoang@techmail.io', phone: '+84 987 654 321', location: 'Hanoi, Vietnam', github: 'github.com/namlh-engineer' },
    summary: 'Results-driven Backend Engineer with over 5.5 years of expertise in full enterprise software lifecycle. Specializing in high-throughput NodeJS and NestJS backend development, relational database modeling in PostgreSQL, and building event-driven systems using Redis and Docker.',
    skills: ['NodeJS', 'NestJS', 'TypeScript', 'PostgreSQL', 'Docker', 'RESTful API', 'Redis', 'AWS', 'GraphQL', 'CI/CD', 'Kafka'],
    experience: [
      {
        role: 'Lead Backend Engineer',
        company: 'NextGen Cloud Systems',
        period: '2022 - Present (3 years)',
        bullets: [
          'Led a cross-functional team of 6 engineers developing NestJS cloud backend for SaaS HR applications.',
          'Configured PostgreSQL replication and managed database migrations with Prisma ORM and TypeORM.',
          'Implemented secure JWT-based authentication with role-based access control (RBAC) and OAuth2 integration.'
        ]
      },
      {
        role: 'Backend Software Engineer',
        company: 'Innovate Asia Software',
        period: '2019 - 2022 (3 years)',
        bullets: [
          'Developed high-performance RESTful APIs serving 2M+ monthly API calls with NodeJS, Express, and PostgreSQL.',
          'Containerized local development workflows using Docker Compose, reducing team onboarding time from 3 days to 2 hours.'
        ]
      }
    ],
    education: { degree: 'Bachelor of Software Engineering', school: 'Hanoi University of Science and Technology (HUST)', year: '2015 - 2019' },
    certifications: ['Docker Certified Associate', 'CKAD: Certified Kubernetes Application Developer']
  },
  {
    fileName: 'cv_be_03.pdf',
    jdId: 'JD_BE',
    category: 'QUALIFIED',
    layout: '2-col',
    language: 'VI',
    fullName: 'Trần Đức Thịnh',
    title: 'Kỹ sư Lập trình Backend (NodeJS / NestJS)',
    contact: { email: 'thinh.tranduc98@gmail.com', phone: '0903 112 233', location: 'Đà Nẵng, Việt Nam', github: 'github.com/ducthinh98' },
    summary: 'Kỹ sư Backend hơn 3.5 năm kinh nghiệm chuyên sâu với hệ sinh thái JavaScript/TypeScript (NodeJS, NestJS). Có thế mạnh thiết kế cơ sở dữ liệu quan hệ PostgreSQL, tối ưu hóa truy vấn SQL phức tạp, triển khai hệ thống container Docker và tích hợp các dịch vụ bên thứ ba qua REST API.',
    skills: ['NodeJS', 'NestJS', 'TypeScript', 'PostgreSQL', 'Docker', 'RESTful API', 'Redis', 'Prisma', 'BullMQ', 'Git'],
    experience: [
      {
        role: 'Senior Backend Developer',
        company: 'Công ty Cổ phần Công nghệ DaNangTech',
        period: '2023 - Hiện tại (2 năm)',
        bullets: [
          'Phát triển toàn bộ hệ thống API nghiệp vụ cho ứng dụng sàn thương mại điện tử bằng NestJS và TypeScript.',
          'Xây dựng schema cơ sở dữ liệu PostgreSQL chuẩn hóa, xử lý hàng đợi background job với Redis và BullMQ.',
          'Thiết lập pipeline CI/CD tự động build Docker image và deploy lên VPS Linux.'
        ]
      },
      {
        role: 'Backend Developer',
        company: 'VinaSoftware Solutions',
        period: '2021 - 2023 (1.5 năm)',
        bullets: [
          'Tham gia thiết kế và viết RESTful API phục vụ hệ thống quản lý học tập (LMS) bằng NodeJS và PostgreSQL.',
          'Phối hợp cùng đội ngũ Frontend (ReactJS) để tích hợp API, xây dựng tài liệu Swagger/OpenAPI chi tiết.'
        ]
      }
    ],
    education: { degree: 'Kỹ sư Công nghệ Thông tin', school: 'Đại học Bách Khoa - Đại học Đà Nẵng', year: '2016 - 2021' },
    certifications: ['Chứng chỉ Lập trình viên Quốc tế Oracle Java SE', 'IELTS 6.5']
  },
  {
    fileName: 'cv_be_04.pdf',
    jdId: 'JD_BE',
    category: 'QUALIFIED',
    layout: '1-col',
    language: 'VI',
    fullName: 'Phạm Thanh Tùng',
    title: 'Senior Backend Software Engineer',
    contact: { email: 'tung.phamthanh@yahoo.com', phone: '0938 776 554', location: 'Hồ Chí Minh, Việt Nam', github: 'github.com/tungpham-be' },
    summary: 'Kỹ sư phần mềm Backend với hơn 6 năm kinh nghiệm trong việc xây dựng hệ thống phân tán, xử lý tải cao và microservices. Thành thạo NodeJS, NestJS, TypeScript, PostgreSQL, Docker và kiến trúc đám mây. Có kinh nghiệm dẫn dắt kỹ thuật và tối ưu hiệu năng toàn diện.',
    skills: ['NodeJS', 'NestJS', 'TypeScript', 'PostgreSQL', 'RESTful API', 'Docker', 'Redis', 'Microservices', 'AWS', 'Postman'],
    experience: [
      {
        role: 'Technical Lead Backend',
        company: 'SmartLog Supply Chain Tech',
        period: '2022 - Hiện tại (3 năm)',
        bullets: [
          'Chịu trách nhiệm kiến trúc dịch vụ Backend cốt lõi bằng NestJS/TypeScript phục vụ hơn 500 doanh nghiệp logistics.',
          'Tối ưu hóa cơ sở dữ liệu PostgreSQL dung lượng 200GB+, phân vùng bảng (partitioning) giúp tăng tốc độ báo cáo gấp 3 lần.',
          'Đóng gói hệ thống với Docker, cấu hình load balancer và giám sát hệ thống với Prometheus/Grafana.'
        ]
      },
      {
        role: 'Senior NodeJS Developer',
        company: 'E-Solution Global',
        period: '2019 - 2022 (3 năm)',
        bullets: [
          'Xây dựng các module thanh toán, quản lý đơn hàng sử dụng NodeJS, NestJS, PostgreSQL và RabbitMQ.',
          'Viết tài liệu API chuẩn OpenAPI/Swagger và thiết lập quy trình kiểm thử tự động.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Mạng máy tính & Truyền thông dữ liệu', school: 'Đại học Khoa học Tự nhiên TP.HCM', year: '2014 - 2018' },
    certifications: ['AWS Certified Solutions Architect Professional', 'Scrum Master Certified (PSM I)']
  },
  {
    fileName: 'cv_be_05.pdf',
    jdId: 'JD_BE',
    category: 'BORDERLINE',
    layout: '1-col',
    language: 'EN',
    fullName: 'Vu Tuan Kiet',
    title: 'Backend Node.js & Express Developer',
    contact: { email: 'kiet.vu.tuan@outlook.com', phone: '+84 945 889 001', location: 'Hanoi, Vietnam', github: 'github.com/kietvudev' },
    summary: 'Backend Developer with 4 years of solid experience in developing RESTful APIs using Node.js, Express.js, TypeScript, PostgreSQL, and Docker. Strong understanding of relational database schema design, indexing, and Docker containerization. Has not worked with NestJS framework yet but eager to adopt quickly.',
    skills: ['NodeJS', 'Express.js', 'TypeScript', 'PostgreSQL', 'Docker', 'RESTful API', 'MongoDB', 'Redis', 'Git'],
    experience: [
      {
        role: 'Backend Developer',
        company: 'Alpha Digital Agency',
        period: '2021 - Present (4 years)',
        bullets: [
          'Developed 20+ backend APIs for web and mobile applications using NodeJS, Express.js, and TypeScript.',
          'Modeled and maintained PostgreSQL databases, writing complex queries and optimizing slow transaction endpoints.',
          'Configured Dockerfiles and multi-stage container builds for testing and staging deployments.'
        ]
      }
    ],
    education: { degree: 'B.S. in Information Systems', school: 'National Economics University (NEU)', year: '2017 - 2021' },
    certifications: ['Meta Certified Back-End Developer']
  },
  {
    fileName: 'cv_be_06.pdf',
    jdId: 'JD_BE',
    category: 'BORDERLINE',
    layout: '2-col',
    language: 'VI',
    fullName: 'Đặng Quốc Bảo',
    title: 'Backend Developer (NodeJS / NestJS)',
    contact: { email: 'bao.dangquoc.dev@gmail.com', phone: '0977 123 998', location: 'Hồ Chí Minh, Việt Nam', github: 'github.com/baodang-code' },
    summary: 'Lập trình viên Backend có 2 năm 4 tháng kinh nghiệm làm việc thực tế với NodeJS, NestJS, TypeScript và PostgreSQL. Có nền tảng thuật toán vững chắc, tư duy hệ thống tốt, đã tự tay xây dựng các dịch vụ RESTful API hoàn chỉnh và triển khai bằng Docker. Chưa đủ mốc 3 năm kinh nghiệm theo yêu cầu Senior.',
    skills: ['NodeJS', 'NestJS', 'TypeScript', 'PostgreSQL', 'Docker', 'RESTful API', 'Git', 'Prisma', 'Postman'],
    experience: [
      {
        role: 'Backend Engineer',
        company: 'Kite Startup Studio',
        period: '2023 - Hiện tại (2 năm 4 tháng)',
        bullets: [
          'Xây dựng các module quản lý người dùng và thanh toán bằng framework NestJS kết hợp PostgreSQL.',
          'Áp dụng nestjs-zod để validate dữ liệu đầu vào và tự động tạo tài liệu Swagger/OpenAPI.',
          'Đóng gói dịch vụ với Docker và triển khai lên máy chủ VPS Ubuntu.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Kỹ thuật Phần mềm', school: 'Đại học FPT TP.HCM', year: '2019 - 2023' },
    certifications: ['IELTS 7.0', 'HackerRank Problem Solving (Intermediate)']
  },
  {
    fileName: 'cv_be_07.pdf',
    jdId: 'JD_BE',
    category: 'BORDERLINE',
    layout: '1-col',
    language: 'VI',
    fullName: 'Hoàng Mạnh Cường',
    title: 'Senior Software Engineer (.NET to NodeJS / NestJS)',
    contact: { email: 'cuong.manhhoang@outlook.com', phone: '0918 334 556', location: 'Hà Nội, Việt Nam', github: 'github.com/cuonghm-dotnet' },
    summary: 'Kỹ sư phần mềm hơn 4 năm kinh nghiệm chuyên môn với nền tảng Backend vững chắc (C#, .NET Core, SQL Server, Docker, Microservices). Đang chuyển đổi định hướng và đã có 8 tháng tự học và làm dự án thực chiến với NodeJS, NestJS, TypeScript và PostgreSQL. Cần thời gian trau dồi thêm độ chín với hệ sinh thái NodeJS.',
    skills: ['C#', '.NET Core', 'NodeJS', 'TypeScript', 'PostgreSQL', 'Docker', 'RESTful API', 'SQL Server', 'Git'],
    experience: [
      {
        role: 'Software Engineer',
        company: 'FPT Software',
        period: '2021 - Hiện tại (4 năm)',
        bullets: [
          'Phát triển hệ thống ngân hàng trực tuyến bằng .NET Core và Microservices; tối ưu cơ sở dữ liệu quan hệ SQL Server và PostgreSQL.',
          'Đóng gói container với Docker và triển khai tự động qua Azure DevOps.',
          'Tự nghiên cứu và xây dựng 2 dự án dịch vụ backend nội bộ bằng NodeJS và NestJS với kiến trúc Clean Architecture.'
        ]
      }
    ],
    education: { degree: 'Kỹ sư Điện tử Viễn thông', school: 'Đại học Bách Khoa Hà Nội', year: '2016 - 2021' },
    certifications: ['Microsoft Certified: Azure Developer Associate']
  },
  {
    fileName: 'cv_be_08.pdf',
    jdId: 'JD_BE',
    category: 'REJECTED',
    layout: '1-col',
    language: 'EN',
    fullName: 'Doan Ngoc Linh',
    title: 'Junior Frontend Web Developer',
    contact: { email: 'linh.doan.fe@gmail.com', phone: '+84 966 221 443', location: 'Da Nang, Vietnam', github: 'github.com/linhdoan-ui' },
    summary: 'Passionate Junior Frontend Developer with 9 months of experience building responsive, accessible, and interactive user interfaces using React, HTML5, CSS3, Tailwind CSS, and basic JavaScript. Seeking opportunities to grow and learn more about web development. No backend or database experience.',
    skills: ['ReactJS', 'HTML5', 'CSS3', 'Tailwind CSS', 'JavaScript', 'Figma', 'Git'],
    experience: [
      {
        role: 'Junior Frontend Developer',
        company: 'Creative Pixel Studio',
        period: '2024 - Present (9 months)',
        bullets: [
          'Converted Figma UI design mockups into pixel-perfect, responsive React components.',
          'Styled components using Tailwind CSS and managed component state with React Hooks.',
          'Integrated third-party REST APIs provided by the backend team.'
        ]
      }
    ],
    education: { degree: 'Associate Degree in Web Design', school: 'Cao Thang Technical College', year: '2021 - 2023' },
    certifications: ['Responsive Web Design - freeCodeCamp']
  },
  {
    fileName: 'cv_be_09.pdf',
    jdId: 'JD_BE',
    category: 'REJECTED',
    layout: '2-col',
    language: 'VI',
    fullName: 'Nguyễn Thị Hương',
    title: 'Chuyên viên Hành chính Nhân sự Tổng hợp',
    contact: { email: 'huong.nguyenhr96@gmail.com', phone: '0981 772 334', location: 'Hà Nội, Việt Nam', github: 'N/A' },
    summary: 'Chuyên viên Hành chính - Nhân sự với 3 năm kinh nghiệm phụ trách quản lý hồ sơ nhân sự, soạn thảo văn bản, tổ chức sự kiện nội bộ và chấm công, tính lương cho doanh nghiệp quy mô 100 nhân sự. Không có kiến thức hoặc kỹ năng về lập trình và công nghệ thông tin.',
    skills: ['Quản trị Nhân sự', 'Microsoft Excel', 'Microsoft Word', 'Soạn thảo văn bản', 'Giao tiếp', 'Tổ chức sự kiện'],
    experience: [
      {
        role: 'Nhân viên Hành chính Nhân sự',
        company: 'Công ty TNHH Thương mại Dịch vụ Ánh Dương',
        period: '2022 - Hiện tại (3 năm)',
        bullets: [
          'Soạn thảo các hợp đồng lao động, quyết định bổ nhiệm và quy chế nội bộ công ty.',
          'Thực hiện thủ tục bảo hiểm xã hội, chấm công và giải đáp thắc mắc cho người lao động.',
          'Lập bảng theo dõi văn phòng phẩm và quản lý tài sản doanh nghiệp bằng Excel.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Quản trị Văn phòng', school: 'Đại học Nội vụ Hà Nội', year: '2017 - 2021' },
    certifications: ['Tin học Văn phòng MOS (Word, Excel)']
  },
  {
    fileName: 'cv_be_10.pdf',
    jdId: 'JD_BE',
    category: 'REJECTED',
    layout: '1-col',
    language: 'VI',
    fullName: 'Trần Bảo Ngọc',
    title: 'Graphic & Brand Identity Designer',
    contact: { email: 'ngoc.design.art@gmail.com', phone: '0909 887 665', location: 'Hồ Chí Minh, Việt Nam', github: 'behance.net/ngoctran-art' },
    summary: 'Nhà thiết kế đồ họa sáng tạo với hơn 3 năm kinh nghiệm trong lĩnh vực thiết kế bộ nhận diện thương hiệu, ấn phẩm truyền thông mạng xã hội, banner quảng cáo và bao bì sản phẩm. Thành thạo Adobe Photoshop, Illustrator và InDesign. Hoàn toàn không có chuyên môn về lập trình phần mềm backend.',
    skills: ['Adobe Photoshop', 'Adobe Illustrator', 'Figma', 'InDesign', 'Branding', 'Typography', 'Creative Thinking'],
    experience: [
      {
        role: 'Graphic Designer',
        company: 'Red Moon Creative Agency',
        period: '2022 - Hiện tại (3 năm)',
        bullets: [
          'Thiết kế bộ nhận diện thương hiệu (Logo, Namecard, Bộ ấn phẩm văn phòng) cho hơn 30 đối tác khách hàng.',
          'Chỉnh sửa hình ảnh sản phẩm, sáng tạo key visual cho các chiến dịch ra mắt sản phẩm mới.',
          'Phối hợp với phòng Marketing để xuất bản các banner quảng cáo đa kích thước.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Thiết kế Đồ họa', school: 'Đại học Kiến trúc TP.HCM', year: '2017 - 2021' },
    certifications: ['Adobe Certified Professional in Visual Design']
  },

  // ==========================================
  // 10 CV CHO JD_DA (Data Analyst)
  // ==========================================
  {
    fileName: 'cv_da_01.pdf',
    jdId: 'JD_DA',
    category: 'QUALIFIED',
    layout: '2-col',
    language: 'EN',
    fullName: 'Do Duc Thang',
    title: 'Senior Data Analyst (BI & Business Analytics)',
    contact: { email: 'thang.dduc.da@gmail.com', phone: '+84 934 567 890', location: 'Ho Chi Minh City, Vietnam', github: 'github.com/thangdoda' },
    summary: 'Analytical and results-driven Data Analyst with 3.5 years of experience delivering actionable business insights and automated reporting solutions. Highly proficient in SQL, Python for exploratory data analysis (EDA), statistical modeling, and designing interactive PowerBI executive dashboards.',
    skills: ['SQL', 'Python', 'PowerBI', 'Data Analysis', 'Statistics', 'Pandas', 'NumPy', 'Tableau', 'DAX', 'ETL', 'A/B Testing'],
    experience: [
      {
        role: 'Data Analyst',
        company: 'Shopee Vietnam Logistics',
        period: '2022 - Present (3 years)',
        bullets: [
          'Engineered complex SQL queries across BigQuery data warehouse (5TB+) to track fulfillment SLAs and delivery bottlenecks.',
          'Built and maintained 12+ real-time executive PowerBI dashboards with advanced DAX measures, saving operations 15 hours of manual reporting per week.',
          'Conducted statistical hypothesis testing and customer retention cohort analysis using Python (Pandas, SciPy).'
        ]
      },
      {
        role: 'Junior Data Analyst',
        company: 'DataMetrics Consultancy',
        period: '2021 - 2022 (1 year)',
        bullets: [
          'Cleaned and transformed customer transaction data using SQL and Python.',
          'Created ad-hoc data visualizations and reports for marketing campaign ROI measurement.'
        ]
      }
    ],
    education: { degree: 'B.S. in Applied Mathematics and Statistics', school: 'University of Science VNU-HCM', year: '2017 - 2021' },
    certifications: ['Microsoft Certified: Power BI Data Analyst Associate (PL-300)']
  },
  {
    fileName: 'cv_da_02.pdf',
    jdId: 'JD_DA',
    category: 'QUALIFIED',
    layout: '1-col',
    language: 'EN',
    fullName: 'Bui Phuong Thao',
    title: 'Lead Data & Analytics Specialist',
    contact: { email: 'thao.buiphuong@outlook.com', phone: '+84 978 112 445', location: 'Hanoi, Vietnam', github: 'github.com/thaobui-analytics' },
    summary: 'Senior Data Analyst with 4.5 years of experience translating massive datasets into strategic commercial growth. Expert in advanced SQL optimization, statistical programming in Python, predictive modeling, and developing enterprise-scale business intelligence dashboards in PowerBI and Tableau.',
    skills: ['SQL', 'Python', 'PowerBI', 'Data Analysis', 'Statistics', 'Tableau', 'BigQuery', 'Data Modeling', 'Data Warehousing'],
    experience: [
      {
        role: 'Senior Data Analyst',
        company: 'Techcom Securities (TCBS)',
        period: '2022 - Present (3 years)',
        bullets: [
          'Developed end-to-end data pipelines and automated reports in SQL and Python for customer wealth management behavior analysis.',
          'Designed high-impact PowerBI dashboards for C-level leadership tracking AUM growth, daily trade volume, and risk exposure metrics.',
          'Applied statistical regression modeling in Python to forecast churn probability, improving retention campaign precision by 22%.'
        ]
      },
      {
        role: 'Data Analyst',
        company: 'Momo E-Wallet',
        period: '2020 - 2022 (2 years)',
        bullets: [
          'Managed merchant analytics datasets using PostgreSQL and Google BigQuery.',
          'Designed interactive Tableau and PowerBI reports for promotional campaign evaluations.'
        ]
      }
    ],
    education: { degree: 'Bachelor in Data Science & Econometrics', school: 'Foreign Trade University (FTU)', year: '2016 - 2020' },
    certifications: ['Google Data Analytics Professional Certificate', 'IBM Data Science Professional Certificate']
  },
  {
    fileName: 'cv_da_03.pdf',
    jdId: 'JD_DA',
    category: 'QUALIFIED',
    layout: '2-col',
    language: 'VI',
    fullName: 'Nguyễn Tiến Đạt',
    title: 'Chuyên viên Phân tích Dữ liệu (Data Analyst)',
    contact: { email: 'dat.nguyentien97@gmail.com', phone: '0912 889 776', location: 'Đà Nẵng, Việt Nam', github: 'github.com/tiendat-data' },
    summary: 'Chuyên viên Phân tích Dữ liệu hơn 3 năm kinh nghiệm làm việc trong môi trường E-commerce và Fintech. Thành thạo truy vấn SQL nâng cao, lập trình Python (Pandas, Matplotlib) phục vụ phân tích dữ liệu chuyên sâu, xây dựng Dashboard PowerBI trực quan và phân tích thống kê định lượng.',
    skills: ['SQL', 'Python', 'PowerBI', 'Data Analysis', 'Statistics', 'Pandas', 'Excel Nâng cao', 'A/B Testing', 'ETL'],
    experience: [
      {
        role: 'Data Analyst',
        company: 'Tiki Corporation',
        period: '2022 - Hiện tại (3 năm)',
        bullets: [
          'Viết truy vấn SQL phức tạp kết nối nhiều nguồn dữ liệu trên PostgreSQL và Snowflake để xây dựng phễu chuyển đổi đơn hàng.',
          'Thiết kế và chuẩn hóa 8 Dashboard PowerBI theo dõi doanh thu theo thời gian thực phục vụ các trưởng bộ phận ngành hàng.',
          'Sử dụng Python để làm sạch dữ liệu lớn và chạy kiểm định thống kê đánh giá hiệu quả thử nghiệm A/B Testing.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Hệ thống Thông tin Quản lý', school: 'Đại học Kinh tế - Đại học Đà Nẵng', year: '2017 - 2021' },
    certifications: ['Microsoft Certified: Power BI Data Analyst (PL-300)']
  },
  {
    fileName: 'cv_da_04.pdf',
    jdId: 'JD_DA',
    category: 'QUALIFIED',
    layout: '1-col',
    language: 'VI',
    fullName: 'Lê Thị Mai',
    title: 'Senior Financial & Business Data Analyst',
    contact: { email: 'mai.lethi.finance@gmail.com', phone: '0945 332 119', location: 'Hà Nội, Việt Nam', github: 'github.com/maile-data' },
    summary: 'Chuyên gia Phân tích Dữ liệu với hơn 5 năm kinh nghiệm trong ngành tài chính ngân hàng. Có thế mạnh vượt trội về khai phá dữ liệu lớn bằng SQL, mô hình hóa số liệu thống kê qua Python và trực quan hóa dữ liệu kinh doanh trực quan với PowerBI. Khả năng tư duy logic và truyền đạt phát hiện dữ liệu xuất sắc.',
    skills: ['SQL', 'Python', 'PowerBI', 'Data Analysis', 'Statistics', 'Dự báo chuỗi thời gian', 'Tableau', 'Data Modeling'],
    experience: [
      {
        role: 'Senior Data Analyst',
        company: 'VPBank Digital Banking',
        period: '2021 - Hiện tại (4 năm)',
        bullets: [
          'Xây dựng các mô hình phân loại khách hàng tiềm năng và dự báo tỷ lệ nợ xấu bằng thuật toán thống kê trên Python.',
          'Tối ưu hóa hơn 100 thủ tục lưu trữ SQL (Stored Procedures), giảm 50% thời gian xử lý dữ liệu cuối ngày.',
          'Phát triển hệ thống PowerBI Dashboard theo dõi dòng tiền và hiệu quả danh mục cho vay tín dụng.'
        ]
      },
      {
        role: 'Data Specialist',
        company: 'Bảo hiểm Quân Đội (MIC)',
        period: '2019 - 2021 (2 năm)',
        bullets: [
          'Trích xuất và làm sạch dữ liệu bồi thường bảo hiểm bằng SQL và Excel nâng cao.',
          'Thực hiện các báo cáo thống kê định kỳ gửi Ban Điều hành.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Kinh tế Quốc tế & Thống kê Kinh doanh', school: 'Đại học Kinh tế Quốc dân (NEU)', year: '2015 - 2019' },
    certifications: ['CFA Level 1 Passed', 'Certified Analytics Professional (CAP)']
  },
  {
    fileName: 'cv_da_05.pdf',
    jdId: 'JD_DA',
    category: 'BORDERLINE',
    layout: '1-col',
    language: 'EN',
    fullName: 'Phan Quang Huy',
    title: 'Business Intelligence & Reporting Analyst',
    contact: { email: 'huy.phanquang.bi@gmail.com', phone: '+84 902 443 221', location: 'Ho Chi Minh City, Vietnam', github: 'github.com/huyphan-bi' },
    summary: 'Dedicated BI Analyst with 3 years of experience specializing in advanced SQL, relational data modeling, and developing interactive PowerBI and Excel dashboards for retail companies. Strong understanding of business KPIs. Does not currently possess Python programming skills but proficient in SQL-based analysis.',
    skills: ['SQL', 'PowerBI', 'Data Analysis', 'DAX', 'Advanced Excel', 'Data Modeling', 'ETL', 'Tableau'],
    experience: [
      {
        role: 'BI & Reporting Analyst',
        company: 'An Nam Gourmet Retail',
        period: '2022 - Present (3 years)',
        bullets: [
          'Wrote advanced SQL queries across PostgreSQL database to extract monthly store inventory and sales revenue data.',
          'Designed comprehensive PowerBI dashboards with customized DAX formulas for regional retail managers.',
          'Automated daily Excel and CSV operational reports, eliminating manual data re-entry.'
        ]
      }
    ],
    education: { degree: 'B.S. in Business Administration', school: 'RMIT University Vietnam', year: '2018 - 2021' },
    certifications: ['Microsoft Office Specialist Expert', 'Power BI Dashboard in a Day']
  },
  {
    fileName: 'cv_da_06.pdf',
    jdId: 'JD_DA',
    category: 'BORDERLINE',
    layout: '2-col',
    language: 'VI',
    fullName: 'Trương Văn An',
    title: 'Junior Data Analyst (SQL / Python / PowerBI)',
    contact: { email: 'an.truongvan99@gmail.com', phone: '0937 665 441', location: 'Hồ Chí Minh, Việt Nam', github: 'github.com/antruong-data' },
    summary: 'Chuyên viên phân tích dữ liệu có 1 năm 4 tháng kinh nghiệm thực tế. Nắm vững kỹ năng viết câu lệnh SQL, lập trình Python (Pandas, NumPy) xử lý dữ liệu, xây dựng dashboard với PowerBI và tư duy phân tích thống kê. Đang nỗ lực tích lũy thêm kinh nghiệm để đạt mốc 2 năm của vị trí Middle.',
    skills: ['SQL', 'Python', 'PowerBI', 'Data Analysis', 'Statistics', 'Pandas', 'Git', 'Excel'],
    experience: [
      {
        role: 'Junior Data Analyst',
        company: 'LogiTrack Vietnam',
        period: '2023 - Hiện tại (1 năm 4 tháng)',
        bullets: [
          'Truy vấn dữ liệu vận chuyển hàng hóa từ cơ sở dữ liệu PostgreSQL bằng SQL.',
          'Làm sạch và chuẩn hóa dữ liệu bị thiếu bằng thư viện Python Pandas.',
          'Tạo các biểu đồ Dashboard trực quan trên PowerBI theo dõi thời gian giao hàng trung bình.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Khoa học Dữ liệu', school: 'Đại học Công nghệ Thông tin (UIT) - ĐHQG TP.HCM', year: '2019 - 2023' },
    certifications: ['Google Data Analytics Certificate']
  },
  {
    fileName: 'cv_da_07.pdf',
    jdId: 'JD_DA',
    category: 'BORDERLINE',
    layout: '1-col',
    language: 'VI',
    fullName: 'Nguyễn Hải Đăng',
    title: 'Business Analyst (Chuyển hướng sang Data Analyst)',
    contact: { email: 'dang.nguyenhai.ba@gmail.com', phone: '0983 221 110', location: 'Hà Nội, Việt Nam', github: 'github.com/haidang-ba' },
    summary: 'Chuyên viên Phân tích Nghiệp vụ (Business Analyst) với hơn 3 năm kinh nghiệm trong việc khảo sát yêu cầu, viết tài liệu BRD/SRS, hiểu biết sâu sắc về mô hình kinh doanh phần mềm. Có kỹ năng viết truy vấn SQL trích xuất số liệu và vẽ biểu đồ PowerBI cơ bản, tuy nhiên chưa có kinh nghiệm lập trình thống kê chuyên sâu với Python.',
    skills: ['Business Analysis', 'SQL', 'PowerBI', 'Data Analysis', 'UML', 'Jira', 'Agile/Scrum', 'Excel'],
    experience: [
      {
        role: 'IT Business Analyst',
        company: 'Savvycom Software',
        period: '2021 - Hiện tại (3.5 năm)',
        bullets: [
          'Làm việc cùng khách hàng thu thập yêu cầu nghiệp vụ và chuyển giao cho đội ngũ phát triển kỹ thuật.',
          'Sử dụng SQL để kiểm tra dữ liệu thực tế trên cơ sở dữ liệu phục vụ xác minh yêu cầu nghiệp vụ.',
          'Tự xây dựng các dashboard PowerBI nội bộ để theo dõi tiến độ dự án và năng suất đội ngũ.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Hệ thống Thông tin Kinh tế', school: 'Học viện Ngân hàng', year: '2017 - 2021' },
    certifications: ['Entry Certificate in Business Analysis (ECBA - IIBA)']
  },
  {
    fileName: 'cv_da_08.pdf',
    jdId: 'JD_DA',
    category: 'REJECTED',
    layout: '1-col',
    language: 'EN',
    fullName: 'Tran Thu Ha',
    title: 'Senior B2B Corporate Sales Executive',
    contact: { email: 'ha.tranthu.sales@gmail.com', phone: '+84 919 556 778', location: 'Hanoi, Vietnam', github: 'N/A' },
    summary: 'Target-driven B2B Sales Executive with 4 years of experience in enterprise software sales, corporate client acquisition, deal closing, and relationship management. Skilled in cold calling, negotiation, and contract finalization. No technical experience in SQL, Python, or data analysis tools.',
    skills: ['B2B Sales', 'CRM (HubSpot)', 'Client Relationship Management', 'Cold Calling', 'Negotiation', 'Contract Closing'],
    experience: [
      {
        role: 'Corporate Sales Specialist',
        company: 'VinaPay Payment Solutions',
        period: '2021 - Present (4 years)',
        bullets: [
          'Acquired 40+ corporate partners and achieved 125% of annual revenue quota consistently.',
          'Managed CRM pipeline and conducted in-person sales pitches to C-suite executives.',
          'Collaborated with customer onboarding team to facilitate contract transition.'
        ]
      }
    ],
    education: { degree: 'Bachelor of International Business', school: 'National Economics University', year: '2017 - 2021' },
    certifications: ['Certified Inside Sales Professional (CISP)']
  },
  {
    fileName: 'cv_da_09.pdf',
    jdId: 'JD_DA',
    category: 'REJECTED',
    layout: '2-col',
    language: 'VI',
    fullName: 'Hoàng Thu Trang',
    title: 'Content Creator & Social Media Executive',
    contact: { email: 'trang.hoangthu.writer@gmail.com', phone: '0972 334 112', location: 'Hồ Chí Minh, Việt Nam', github: 'N/A' },
    summary: 'Nhà sáng tạo nội dung truyền thông năng động với 2 năm kinh nghiệm viết bài PR, quản trị fanpage Facebook, sáng tạo kịch bản video TikTok và viral marketing. Thế mạnh về ngôn từ, nắm bắt xu hướng giới trẻ. Hoàn toàn không có kỹ năng kỹ thuật, truy vấn SQL hay phân tích dữ liệu chuyên sâu.',
    skills: ['Content Writing', 'Copywriting', 'Quản trị Fanpage', 'Kịch bản TikTok', 'Canva', 'Sáng tạo nội dung'],
    experience: [
      {
        role: 'Content Marketing Executive',
        company: 'Công ty Truyền thông BrandBoost',
        period: '2023 - Hiện tại (2 năm)',
        bullets: [
          'Sáng tạo hơn 50 bài viết hàng tháng trên Fanpage và Blog cho các nhãn hàng F&B.',
          'Sản xuất các video ngắn TikTok đạt triệu view, tăng tương tác tự nhiên cho kênh.',
          'Lên ý tưởng thông điệp truyền thông cho các chiến dịch quảng cáo ngày lễ.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Báo chí & Truyền thông', school: 'Đại học Khoa học Xã hội & Nhân văn TP.HCM', year: '2019 - 2023' },
    certifications: ['Chứng chỉ Copywriting thực chiến']
  },
  {
    fileName: 'cv_da_10.pdf',
    jdId: 'JD_DA',
    category: 'REJECTED',
    layout: '1-col',
    language: 'VI',
    fullName: 'Nguyễn Văn Hùng',
    title: 'Customer Service & Technical Support Lead',
    contact: { email: 'hung.nguyenvan.cs@gmail.com', phone: '0908 443 889', location: 'Đà Nẵng, Việt Nam', github: 'N/A' },
    summary: 'Trưởng nhóm Dịch vụ Khách hàng với 3 năm kinh nghiệm trong việc tiếp nhận cuộc gọi tổng đài, xử lý khiếu nại khách hàng, quản lý phần mềm ticket và nâng cao chỉ số hài lòng khách hàng (CSAT). Khả năng giao tiếp và xử lý tình huống khéo léo. Không có chuyên môn về SQL, Python hay phân tích dữ liệu.',
    skills: ['Customer Support', 'Call Center', 'Zendesk', 'Xử lý khiếu nại', 'Chăm sóc khách hàng', 'Kỹ năng lắng nghe'],
    experience: [
      {
        role: 'Customer Support Lead',
        company: 'Công ty TNHH Dịch vụ Viễn thông CallCenter Pro',
        period: '2022 - Hiện tại (3 năm)',
        bullets: [
          'Dẫn dắt đội ngũ 10 nhân viên trực tổng đài hỗ trợ kỹ thuật và giải đáp thắc mắc dịch vụ.',
          'Xử lý hơn 2,000 phiếu khiếu nại phức tạp mỗi tháng qua hệ thống Zendesk.',
          'Duy trì chỉ số CSAT đạt trên 94% trong suốt 4 quý liên tiếp.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Ngôn ngữ Anh', school: 'Đại học Ngoại ngữ - Đại học Đà Nẵng', year: '2017 - 2021' },
    certifications: ['Chứng chỉ Quản trị Dịch vụ Khách hàng Chuyên nghiệp']
  },

  // ==========================================
  // 10 CV CHO JD_MKT (Digital Marketing Specialist)
  // ==========================================
  {
    fileName: 'cv_mkt_01.pdf',
    jdId: 'JD_MKT',
    category: 'QUALIFIED',
    layout: '2-col',
    language: 'EN',
    fullName: 'Nguyen Yen Nhi',
    title: 'Senior Digital Marketing Specialist (SEO & Performance)',
    contact: { email: 'nhi.nguyenyen.mkt@gmail.com', phone: '+84 947 889 002', location: 'Ho Chi Minh City, Vietnam', github: 'linkedin.com/in/yennhi-digital' },
    summary: 'Results-driven Digital Marketing Specialist with 3.5 years of comprehensive experience executing integrated online marketing campaigns. Proven mastery in technical SEO, Google Ads (Search & Shopping), Meta Ads, Google Analytics 4 tracking, and high-converting content marketing strategies.',
    skills: ['SEO', 'Google Ads', 'Meta Ads', 'Content Marketing', 'Google Analytics', 'A/B Testing', 'Copywriting', 'Email Marketing', 'Keyword Research'],
    experience: [
      {
        role: 'Senior Digital Marketing Specialist',
        company: 'Lumi E-Commerce Retail',
        period: '2022 - Present (3 years)',
        bullets: [
          'Managed monthly ad budget of $25,000+ across Google Ads and Meta Ads, maintaining an average ROAS of 4.2x.',
          'Executed technical SEO strategy and on-page optimization, increasing organic organic search traffic by 120% YoY.',
          'Configured Google Analytics 4 (GA4) event tracking and Google Tag Manager for full funnel e-commerce attribution.'
        ]
      },
      {
        role: 'Digital Marketing Executive',
        company: 'Asia Digital Growth Agency',
        period: '2021 - 2022 (1 year)',
        bullets: [
          'Created multi-channel content plans and executed paid search advertising for B2B tech clients.',
          'A/B tested ad creatives and landing page copy, improving conversion rates by 18%.'
        ]
      }
    ],
    education: { degree: 'Bachelor of Marketing', school: 'University of Economics Ho Chi Minh City (UEH)', year: '2017 - 2021' },
    certifications: ['Google Ads Search Certification', 'Google Analytics Individual Qualification (GA4)', 'Meta Certified Digital Marketing Associate']
  },
  {
    fileName: 'cv_mkt_02.pdf',
    jdId: 'JD_MKT',
    category: 'QUALIFIED',
    layout: '1-col',
    language: 'EN',
    fullName: 'Tran Gia Huy',
    title: 'Performance Marketing & SEO Manager',
    contact: { email: 'huy.trangia.mkt@outlook.com', phone: '+84 938 123 667', location: 'Hanoi, Vietnam', github: 'linkedin.com/in/giahuy-growth' },
    summary: 'Performance Marketing Leader with over 4.5 years of expertise in driving customer acquisition and scaling digital revenue for B2C & B2B brands. Expert in multi-channel paid acquisition (Google Ads, Meta Ads), advanced SEO audit, data tracking via GA4, and content marketing funnels.',
    skills: ['SEO', 'Google Ads', 'Meta Ads', 'Content Marketing', 'Google Analytics', 'Conversion Rate Optimization (CRO)', 'GTM', 'TikTok Ads'],
    experience: [
      {
        role: 'Performance Marketing Manager',
        company: 'VietEd Education Technology',
        period: '2022 - Present (3 years)',
        bullets: [
          'Spearheaded end-to-end paid acquisition campaigns across Google Search/Display and Facebook Ads, generating 15,000+ qualified leads annually.',
          'Audited website architecture, built authoritative backlink profiles, and ranked 50+ high-intent keywords into Google Top 3.',
          'Integrated GA4 with Looker Studio to deliver weekly acquisition and CPA performance insights to leadership.'
        ]
      },
      {
        role: 'Digital Marketer',
        company: 'NextGen Media Corp',
        period: '2020 - 2022 (2 years)',
        bullets: [
          'Administered PPC campaigns on Google Ads and Facebook Ads Manager with optimal cost per click (CPC).',
          'Authored high-ranking SEO blog articles and automated email nurturing sequences.'
        ]
      }
    ],
    education: { degree: 'B.A. in International Business & Marketing', school: 'Foreign Trade University (FTU)', year: '2016 - 2020' },
    certifications: ['Google Ads Measurement Certification', 'HubSpot Inbound Marketing Certified']
  },
  {
    fileName: 'cv_mkt_03.pdf',
    jdId: 'JD_MKT',
    category: 'QUALIFIED',
    layout: '2-col',
    language: 'VI',
    fullName: 'Lê Ngọc Ánh',
    title: 'Chuyên viên Tiếp thị Kỹ thuật số (Digital Marketing)',
    contact: { email: 'anh.lengoc.marketing@gmail.com', phone: '0903 445 667', location: 'Hồ Chí Minh, Việt Nam', github: 'linkedin.com/in/ngocanh-mkt' },
    summary: 'Chuyên viên Digital Marketing với 3 năm kinh nghiệm thực chiến trong các chiến dịch tiếp thị số đa kênh. Am hiểu sâu sắc về tối ưu hóa công cụ tìm kiếm (SEO), trực tiếp phân bổ ngân sách và chạy quảng cáo Google Ads, Meta Ads, kết hợp chiến lược Content Marketing dẫn dắt chuyển đổi và phân tích dữ liệu qua Google Analytics.',
    skills: ['SEO', 'Google Ads', 'Meta Ads', 'Content Marketing', 'Google Analytics', 'A/B Testing', 'Copywriting', 'Canva', 'Email Marketing'],
    experience: [
      {
        role: 'Digital Marketing Specialist',
        company: 'Công ty Cổ phần Bán lẻ Thời trang Nova',
        period: '2022 - Hiện tại (3 năm)',
        bullets: [
          'Quản lý và vận hành chiến dịch quảng cáo Google Ads và Meta Ads với ngân sách 300 triệu đồng/tháng, đạt ROAS trung bình 3.8x.',
          'Thực hiện tối ưu hóa SEO tổng thể website, đẩy hơn 100 từ khóa ngành thời trang vào Top 5 Google tìm kiếm.',
          'Sử dụng Google Analytics 4 theo dõi hành vi mua sắm, phát hiện điểm rơi phễu và tối ưu tỷ lệ chuyển đổi (CR) tăng 25%.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Marketing', school: 'Đại học Tài chính - Marketing (UFM)', year: '2017 - 2021' },
    certifications: ['Chứng chỉ Google Ads Search & Display', 'Chứng chỉ Google Analytics (GA4)']
  },
  {
    fileName: 'cv_mkt_04.pdf',
    jdId: 'JD_MKT',
    category: 'QUALIFIED',
    layout: '1-col',
    language: 'VI',
    fullName: 'Phạm Minh Châu',
    title: 'Senior Growth & Digital Marketing Lead',
    contact: { email: 'chau.phamminh.growth@gmail.com', phone: '0979 223 118', location: 'Đà Nẵng, Việt Nam', github: 'linkedin.com/in/minhchau-growth' },
    summary: 'Chuyên gia Digital Marketing với hơn 5 năm kinh nghiệm dẫn dắt các chiến dịch tăng trưởng số lượng người dùng cho các sản phẩm công nghệ và du lịch. Nắm vững kỹ năng chạy quảng cáo Performance (Google Ads, Meta Ads), chiến lược SEO dài hạn, xây dựng kịch bản nội dung chuyển đổi và đo lường ROI qua Google Analytics.',
    skills: ['SEO', 'Google Ads', 'Meta Ads', 'Content Marketing', 'Google Analytics', 'Email Automation', 'Kế hoạch Marketing', 'CRO'],
    experience: [
      {
        role: 'Digital Marketing Team Lead',
        company: 'Danang Booking Travel Tech',
        period: '2021 - Hiện tại (4 năm)',
        bullets: [
          'Chịu trách nhiệm toàn bộ chiến lược Digital Marketing và ngân sách quảng cáo số 1 tỷ đồng/năm cho nền tảng đặt phòng trực tuyến.',
          'Tối ưu hóa chiến dịch Google Search và Facebook Retargeting Ads, giảm chi phí thu nạp khách hàng (CPA) 30%.',
          'Xây dựng hệ sinh thái nội dung blog chuẩn SEO và triển khai email marketing nuôi dưỡng khách hàng tự động.'
        ]
      },
      {
        role: 'Marketing Executive',
        company: 'Sunrise Hotel Group',
        period: '2019 - 2021 (2 năm)',
        bullets: [
          'Chạy các chiến dịch quảng cáo Google Ads và Facebook Ads thu hút khách du lịch.',
          'Phân tích số liệu truy cập website bằng Google Analytics để lập báo cáo tuần cho ban giám đốc.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Quản trị Kinh doanh', school: 'Đại học Kinh tế - Đại học Đà Nẵng', year: '2015 - 2019' },
    certifications: ['HubSpot Inbound Certified', 'Google Ads Professional']
  },
  {
    fileName: 'cv_mkt_05.pdf',
    jdId: 'JD_MKT',
    category: 'BORDERLINE',
    layout: '1-col',
    language: 'EN',
    fullName: 'Vo Hoang Phuc',
    title: 'Content & Social Media Marketer (Lacks Google Ads & SEO)',
    contact: { email: 'phuc.vohoang.social@gmail.com', phone: '+84 918 776 554', location: 'Ho Chi Minh City, Vietnam', github: 'linkedin.com/in/phucvo-social' },
    summary: 'Creative Social Media & Content Marketer with 3.5 years of experience producing high-engagement content and managing Facebook and Instagram paid ad campaigns. Strong storytelling, copywriting, and basic analytics skills. Lacks practical experience in Google Ads search campaigns and technical SEO optimization.',
    skills: ['Content Marketing', 'Meta Ads', 'Copywriting', 'Social Media Management', 'Google Analytics', 'Canva', 'TikTok Ads'],
    experience: [
      {
        role: 'Content & Social Media Specialist',
        company: 'Trendy Lifestyle Goods',
        period: '2021 - Present (3.5 years)',
        bullets: [
          'Authored high-converting creative copies and managed Meta ad sets for lifestyle product releases.',
          'Grew organic TikTok and Instagram followers by 200% through engaging creative short videos.',
          'Tracked social traffic engagement using Google Analytics 4.'
        ]
      }
    ],
    education: { degree: 'Bachelor of Arts in English for Business', school: 'HUTECH University', year: '2017 - 2021' },
    certifications: ['HubSpot Content Marketing Certification']
  },
  {
    fileName: 'cv_mkt_06.pdf',
    jdId: 'JD_MKT',
    category: 'BORDERLINE',
    layout: '2-col',
    language: 'VI',
    fullName: 'Đặng Mỹ Duyên',
    title: 'Junior Digital Marketing Executive',
    contact: { email: 'duyen.dangmy.mkt@gmail.com', phone: '0932 118 997', location: 'Hà Nội, Việt Nam', github: 'linkedin.com/in/myduyen-mkt' },
    summary: 'Chuyên viên Digital Marketing trẻ có 1 năm 2 tháng kinh nghiệm thực tế. Đã trực tiếp tham gia cài đặt chiến dịch Google Ads, Meta Ads, nghiên cứu từ khóa viết bài SEO và theo dõi số liệu Google Analytics. Nhiệt huyết và tiếp thu nhanh, tuy nhiên số năm kinh nghiệm chưa đáp ứng yêu cầu tối thiểu 2 năm.',
    skills: ['SEO', 'Google Ads', 'Meta Ads', 'Content Marketing', 'Google Analytics', 'Canva', 'Copywriting'],
    experience: [
      {
        role: 'Digital Marketing Executive',
        company: 'Công ty Cổ phần Giáo dục Minh Trí',
        period: '2023 - Hiện tại (1 năm 2 tháng)',
        bullets: [
          'Trực tiếp quản lý và tối ưu hóa ngân sách quảng cáo Meta Ads 30 triệu đồng/tháng cho các khóa học trực tuyến.',
          'Viết bài chuẩn SEO và tối ưu hóa bài viết blog trên nền tảng WordPress.',
          'Theo dõi số lượt chuyển đổi và truy cập website qua Google Analytics 4.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Truyền thông Đa phương tiện', school: 'Học viện Báo chí và Tuyên truyền', year: '2019 - 2023' },
    certifications: ['Google Ads Search Certification']
  },
  {
    fileName: 'cv_mkt_07.pdf',
    jdId: 'JD_MKT',
    category: 'BORDERLINE',
    layout: '1-col',
    language: 'VI',
    fullName: 'Nguyễn Quỳnh Nga',
    title: 'PR & Event Specialist (Chuyển sang Digital Marketing)',
    contact: { email: 'nga.nguyenquynh.pr@gmail.com', phone: '0971 445 229', location: 'Hà Nội, Việt Nam', github: 'linkedin.com/in/quynhnga-pr' },
    summary: 'Chuyên viên Quan hệ Công chúng (PR) và Tổ chức Sự kiện với 3 năm kinh nghiệm xây dựng hình ảnh thương hiệu và làm việc cùng báo chí, KOLs. Đang chuyển đổi định hướng sang Digital Marketing, có thế mạnh sáng tạo Content Marketing xuất sắc nhưng còn thiếu kinh nghiệm kỹ thuật về thiết lập quảng cáo Google Ads và tối ưu SEO chuyên sâu.',
    skills: ['PR & Truyền thông', 'Content Marketing', 'Tổ chức sự kiện', 'Copywriting', 'KOL Management', 'Meta Ads cơ bản'],
    experience: [
      {
        role: 'PR & Communications Executive',
        company: 'Golden Bell Event Agency',
        period: '2022 - Hiện tại (3 năm)',
        bullets: [
          'Lập kế hoạch truyền thông báo chí và tổ chức thành công hơn 15 sự kiện ra mắt thương hiệu lớn.',
          'Biên tập thông cáo báo chí, bài phỏng vấn và nội dung truyền thông cho các nhãn hàng.',
          'Tự học và hỗ trợ chạy thử nghiệm một số chiến dịch quảng cáo Facebook Ads cho các sự kiện triển lãm.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Quan hệ Quốc tế', school: 'Học viện Ngoại giao', year: '2017 - 2021' },
    certifications: ['Chứng chỉ PR & Quản trị Truyền thông Doanh nghiệp']
  },
  {
    fileName: 'cv_mkt_08.pdf',
    jdId: 'JD_MKT',
    category: 'REJECTED',
    layout: '1-col',
    language: 'EN',
    fullName: 'Ta Van Minh',
    title: 'Senior Embedded Firmware Engineer',
    contact: { email: 'minh.tavan.embedded@gmail.com', phone: '+84 905 119 882', location: 'Da Nang, Vietnam', github: 'github.com/minhtavan-iot' },
    summary: 'Embedded Software Engineer with 4 years of experience programming microcontrollers, IoT hardware devices, and low-level firmware using C/C++, FreeRTOS, and Linux Kernel drivers. Expert in UART, SPI, and I2C hardware protocols. Completely unrelated to digital marketing or advertising.',
    skills: ['C/C++', 'Embedded Systems', 'FreeRTOS', 'ARM Cortex', 'IoT', 'Hardware Debugging', 'PCB Design', 'Linux'],
    experience: [
      {
        role: 'Firmware Engineer',
        company: 'SmartSensor IoT Technologies',
        period: '2021 - Present (4 years)',
        bullets: [
          'Developed robust C/C++ firmware for smart metering devices connected via LoRaWAN protocol.',
          'Optimized power consumption on battery-operated microcontrollers, extending device battery life to 5 years.',
          'Debugged hardware protocols using oscilloscope and logic analyzers.'
        ]
      }
    ],
    education: { degree: 'B.S. in Electrical and Electronics Engineering', school: 'Danang University of Science and Technology', year: '2017 - 2021' },
    certifications: ['Certified Embedded Systems Professional']
  },
  {
    fileName: 'cv_mkt_09.pdf',
    jdId: 'JD_MKT',
    category: 'REJECTED',
    layout: '2-col',
    language: 'VI',
    fullName: 'Đinh Thị Lan',
    title: 'Kế toán Tổng hợp & Kế toán Thuế',
    contact: { email: 'lan.dinhthi.accountant@gmail.com', phone: '0988 554 221', location: 'Hồ Chí Minh, Việt Nam', github: 'N/A' },
    summary: 'Kế toán tổng hợp với hơn 4 năm kinh nghiệm quản lý sổ sách tài chính, lập báo cáo thuế, kiểm soát hóa đơn chứng từ và tính lương cho doanh nghiệp sản xuất và thương mại. Thành thạo phần mềm MISA, FAST và Excel. Hoàn toàn không có chuyên môn hoặc kỹ năng về Digital Marketing, SEO hay quảng cáo trực tuyến.',
    skills: ['Kế toán thuế', 'Kế toán tổng hợp', 'Phần mềm MISA', 'Phần mềm FAST', 'Báo cáo tài chính', 'Excel Kế toán'],
    experience: [
      {
        role: 'Kế toán Tổng hợp',
        company: 'Công ty Cổ phần Sản xuất Nhựa Nam Á',
        period: '2021 - Hiện tại (4 năm)',
        bullets: [
          'Kiểm tra tính hợp lệ của hóa đơn, chứng từ kế toán và hạch toán vào phần mềm MISA.',
          'Lập báo cáo tài chính năm, quyết toán thuế thu nhập doanh nghiệp và thuế thu nhập cá nhân định kỳ.',
          'Theo dõi công nợ khách hàng và đối chiếu số dư ngân hàng hàng tháng.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Kế toán Doanh nghiệp', school: 'Đại học Kinh tế TP.HCM (UEH)', year: '2016 - 2020' },
    certifications: ['Chứng chỉ Kế toán trưởng Quốc gia']
  },
  {
    fileName: 'cv_mkt_10.pdf',
    jdId: 'JD_MKT',
    category: 'REJECTED',
    layout: '1-col',
    language: 'VI',
    fullName: 'Vũ Đình Phong',
    title: 'Software Quality Assurance (QA / QC Tester)',
    contact: { email: 'phong.vudinh.qa@gmail.com', phone: '0917 228 990', location: 'Hà Nội, Việt Nam', github: 'github.com/phongvu-tester' },
    summary: 'Chuyên viên kiểm thử phần mềm (QA Tester) với gần 3 năm kinh nghiệm kiểm thử thủ công (Manual Testing) các ứng dụng web và mobile. Thành thạo phân tích yêu cầu phần mềm, viết test case, log bug trên Jira và kiểm thử API bằng Postman. Không có bất kỳ kỹ năng nào về Digital Marketing hay chạy quảng cáo.',
    skills: ['Manual Testing', 'Test Case Design', 'Jira', 'Postman API Testing', 'Bug Life Cycle', 'SQL cơ bản'],
    experience: [
      {
        role: 'Manual QA Engineer',
        company: 'VinaTech Solutions Group',
        period: '2022 - Hiện tại (2.8 năm)',
        bullets: [
          'Đọc tài liệu đặc tả yêu cầu người dùng (SRS) và thiết kế hơn 500 test case cho hệ thống CRM bán hàng.',
          'Thực hiện kiểm thử chức năng (Functional Testing), kiểm thử hồi quy (Regression Testing) trước các đợt phát hành.',
          'Kiểm tra định dạng phản hồi API và mã lỗi HTTP bằng Postman.'
        ]
      }
    ],
    education: { degree: 'Cử nhân Công nghệ Thông tin', school: 'Viện Đại học Mở Hà Nội', year: '2017 - 2021' },
    certifications: ['ISTQB Certified Tester Foundation Level (CTFL)']
  }
];

// Hàm vẽ CV 1 cột
function renderOneColumnCV(doc, data) {
  const margin = 40;
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - margin * 2;

  // Header
  doc.rect(margin, margin, contentWidth, 80).fill('#1E293B');
  doc.fillColor('#FFFFFF').font('Arial-Bold').fontSize(20).text(data.fullName, margin + 20, margin + 15);
  doc.fillColor('#38BDF8').font('Arial-Bold').fontSize(11).text(data.title.toUpperCase(), margin + 20, margin + 42);

  const contactText = `${data.contact.email}  |  ${data.contact.phone}  |  ${data.contact.location}`;
  doc.fillColor('#CBD5E1').font('Arial').fontSize(9).text(contactText, margin + 20, margin + 60);

  let currentY = margin + 95;

  // Section: Summary
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(12).text(data.language === 'EN' ? 'PROFESSIONAL SUMMARY' : 'TÓM TẮT CHUYÊN MÔN', margin, currentY);
  currentY += 16;
  doc.rect(margin, currentY, contentWidth, 1.5).fill('#38BDF8');
  currentY += 8;
  doc.fillColor('#334155').font('Arial').fontSize(9.5).text(data.summary, margin, currentY, { width: contentWidth, lineGap: 3 });
  currentY = doc.y + 14;

  // Section: Skills
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(12).text(data.language === 'EN' ? 'CORE COMPETENCIES & SKILLS' : 'KỸ NĂNG CHUYÊN MÔN', margin, currentY);
  currentY += 16;
  doc.rect(margin, currentY, contentWidth, 1.5).fill('#38BDF8');
  currentY += 8;
  const skillsText = data.skills.join('  •  ');
  doc.fillColor('#1E293B').font('Arial-Bold').fontSize(9.5).text(skillsText, margin, currentY, { width: contentWidth, lineGap: 4 });
  currentY = doc.y + 14;

  // Section: Experience
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(12).text(data.language === 'EN' ? 'PROFESSIONAL EXPERIENCE' : 'KINH NGHIỆM LÀM VIỆC', margin, currentY);
  currentY += 16;
  doc.rect(margin, currentY, contentWidth, 1.5).fill('#38BDF8');
  currentY += 10;

  for (const exp of data.experience) {
    doc.fillColor('#0F172A').font('Arial-Bold').fontSize(10.5).text(exp.role, margin, currentY);
    doc.fillColor('#0284C7').font('Arial-Bold').fontSize(9.5).text(`${exp.company}  |  ${exp.period}`, margin, doc.y + 2);
    currentY = doc.y + 5;

    for (const bullet of exp.bullets) {
      doc.fillColor('#334155').font('Arial').fontSize(9).text(`•  ${bullet}`, margin + 8, currentY, { width: contentWidth - 8, lineGap: 2.5 });
      currentY = doc.y + 3;
    }
    currentY += 6;
  }

  // Section: Education & Certifications
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(12).text(data.language === 'EN' ? 'EDUCATION & CERTIFICATIONS' : 'HỌC VẤN & CHỨNG CHỈ', margin, currentY);
  currentY += 16;
  doc.rect(margin, currentY, contentWidth, 1.5).fill('#38BDF8');
  currentY += 8;

  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(9.5).text(data.education.degree, margin, currentY);
  doc.fillColor('#475569').font('Arial').fontSize(9).text(`${data.education.school}  (${data.education.year})`, margin, doc.y + 2);
  currentY = doc.y + 5;

  if (data.certifications && data.certifications.length > 0) {
    const certText = (data.language === 'EN' ? 'Certifications: ' : 'Chứng chỉ: ') + data.certifications.join('; ');
    doc.fillColor('#334155').font('Arial').fontSize(8.5).text(certText, margin, currentY, { width: contentWidth });
  }
}

// Hàm vẽ CV 2 cột
function renderTwoColumnCV(doc, data) {
  const margin = 35;
  const pageWidth = doc.page.width;
  const leftColWidth = 165;
  const colGap = 20;
  const rightColWidth = pageWidth - margin * 2 - leftColWidth - colGap;
  const rightColX = margin + leftColWidth + colGap;

  // Header chung ở trên
  doc.rect(margin, margin, pageWidth - margin * 2, 65).fill('#0F172A');
  doc.fillColor('#FFFFFF').font('Arial-Bold').fontSize(18).text(data.fullName, margin + 15, margin + 12);
  doc.fillColor('#38BDF8').font('Arial-Bold').fontSize(10.5).text(data.title.toUpperCase(), margin + 15, margin + 35);

  const startY = margin + 80;

  // Cột Trái (Background xám nhạt)
  doc.rect(margin, startY, leftColWidth, doc.page.height - startY - margin).fill('#F8FAFC');

  // Cột Trái: Contact
  let leftY = startY + 12;
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(10).text(data.language === 'EN' ? 'CONTACT INFO' : 'THÔNG TIN LIÊN HỆ', margin + 10, leftY);
  leftY += 14;
  doc.rect(margin + 10, leftY, leftColWidth - 20, 1).fill('#94A3B8');
  leftY += 6;
  doc.fillColor('#334155').font('Arial').fontSize(8).text(`Email:\n${data.contact.email}\n\nPhone:\n${data.contact.phone}\n\nLocation:\n${data.contact.location}`, margin + 10, leftY, { width: leftColWidth - 20, lineGap: 2 });
  leftY = doc.y + 16;

  // Cột Trái: Skills
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(10).text(data.language === 'EN' ? 'SKILLS' : 'KỸ NĂNG', margin + 10, leftY);
  leftY += 14;
  doc.rect(margin + 10, leftY, leftColWidth - 20, 1).fill('#94A3B8');
  leftY += 6;
  for (const sk of data.skills) {
    doc.fillColor('#1E293B').font('Arial-Bold').fontSize(8).text(`• ${sk}`, margin + 10, leftY);
    leftY = doc.y + 2;
  }
  leftY += 12;

  // Cột Trái: Education
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(10).text(data.language === 'EN' ? 'EDUCATION' : 'HỌC VẤN', margin + 10, leftY);
  leftY += 14;
  doc.rect(margin + 10, leftY, leftColWidth - 20, 1).fill('#94A3B8');
  leftY += 6;
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(8).text(data.education.degree, margin + 10, leftY, { width: leftColWidth - 20 });
  leftY = doc.y + 2;
  doc.fillColor('#475569').font('Arial').fontSize(7.5).text(`${data.education.school}\n${data.education.year}`, margin + 10, leftY, { width: leftColWidth - 20 });
  leftY = doc.y + 12;

  // Cột Trái: Certifications
  if (data.certifications && data.certifications.length > 0) {
    doc.fillColor('#0F172A').font('Arial-Bold').fontSize(10).text(data.language === 'EN' ? 'CERTIFICATIONS' : 'CHỨNG CHỈ', margin + 10, leftY);
    leftY += 14;
    doc.rect(margin + 10, leftY, leftColWidth - 20, 1).fill('#94A3B8');
    leftY += 6;
    for (const cert of data.certifications) {
      doc.fillColor('#334155').font('Arial').fontSize(7.5).text(`✓ ${cert}`, margin + 10, leftY, { width: leftColWidth - 20, lineGap: 1.5 });
      leftY = doc.y + 3;
    }
  }

  // Cột Phải: Summary
  let rightY = startY + 12;
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(11).text(data.language === 'EN' ? 'EXECUTIVE SUMMARY' : 'MỤC TIÊU & TỔNG QUAN', rightColX, rightY);
  rightY += 15;
  doc.rect(rightColX, rightY, rightColWidth, 1).fill('#0284C7');
  rightY += 6;
  doc.fillColor('#334155').font('Arial').fontSize(8.5).text(data.summary, rightColX, rightY, { width: rightColWidth, lineGap: 2.5 });
  rightY = doc.y + 14;

  // Cột Phải: Experience
  doc.fillColor('#0F172A').font('Arial-Bold').fontSize(11).text(data.language === 'EN' ? 'WORK EXPERIENCE' : 'KINH NGHIỆM LÀM VIỆC', rightColX, rightY);
  rightY += 15;
  doc.rect(rightColX, rightY, rightColWidth, 1).fill('#0284C7');
  rightY += 8;

  for (const exp of data.experience) {
    doc.fillColor('#0F172A').font('Arial-Bold').fontSize(9.5).text(exp.role, rightColX, rightY);
    doc.fillColor('#0284C7').font('Arial-Bold').fontSize(8.5).text(`${exp.company}  |  ${exp.period}`, rightColX, doc.y + 1);
    rightY = doc.y + 4;

    for (const bullet of exp.bullets) {
      doc.fillColor('#334155').font('Arial').fontSize(8).text(`•  ${bullet}`, rightColX + 5, rightY, { width: rightColWidth - 5, lineGap: 2 });
      rightY = doc.y + 3;
    }
    rightY += 6;
  }
}

// Sinh 30 file PDF
console.log('🔄 Đang sinh 30 file CV PDF...');
for (const cv of cvList) {
  const filePath = path.join(cvsDir, cv.fileName);
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  doc.registerFont('Arial', fontRegular);
  doc.registerFont('Arial-Bold', fontBold);

  if (cv.layout === '2-col') {
    renderTwoColumnCV(doc, cv);
  } else {
    renderOneColumnCV(doc, cv);
  }

  doc.end();
}
console.log('✅ Đã tạo thành công 30 file CV PDF!');

// Sinh 2 file PDF scan (pure image without text layer)
console.log('🔄 Đang tạo 2 file PDF scan lỗi text layer...');
const scansDirForward = scansDir.replace(/\\/g, '/');
const pythonScript = `
import os
from PIL import Image, ImageDraw

scans_dir = "${scansDirForward}"
os.makedirs(scans_dir, exist_ok=True)

img1 = Image.new('RGB', (1240, 1754), color=(245, 245, 240))
d1 = ImageDraw.Draw(img1)
d1.rectangle([(80, 80), (1160, 200)], fill=(230, 230, 225))
d1.text((100, 110), "HO SO UNG VIEN - SCAN PHOTOCOPY", fill=(80, 80, 80))
d1.text((100, 150), "Ho va ten: Tran Van Scan - Vi tri: Nhan vien ky thuat", fill=(100, 100, 100))
d1.line([(80, 220), (1160, 220)], fill=(180, 180, 180), width=2)
d1.text((100, 260), "KINH NGHIEP: 2 nam bao tri thiet bi may moc van phong.", fill=(90, 90, 90))
d1.text((100, 310), "KY NANG: Sua chua dien gia dung, han gio da, bao tri may in.", fill=(90, 90, 90))
d1.text((100, 360), "[Luu y: Tai lieu scan tu may photocopy cu khong chua text stream]", fill=(140, 140, 140))
img1.save(os.path.join(scans_dir, 'cv_scan_01.pdf'), 'PDF')

img2 = Image.new('RGB', (1200, 1600), color=(238, 237, 232))
d2 = ImageDraw.Draw(img2)
d2.text((90, 100), "RESUME DOCUMENT (SCANNED CAMERA PHOTO)", fill=(70, 70, 70))
d2.text((90, 140), "Candidate: Le Thi Chup Hinh - Role: Office Assistant", fill=(90, 90, 90))
d2.line([(90, 180), (1110, 180)], fill=(160, 160, 160), width=3)
d2.text((90, 220), "Summary: Hardworking assistant seeking full-time employment.", fill=(80, 80, 80))
d2.text((90, 270), "Skills: Microsoft Word, Filing documents, Answering calls.", fill=(80, 80, 80))
d2.text((90, 320), "Note: Image captured via smartphone camera at 72 DPI, zero text stream.", fill=(130, 130, 130))
img2.save(os.path.join(scans_dir, 'cv_scan_02.pdf'), 'PDF')
print("Scans successfully created!")
`;

execSync(`python -c "${pythonScript.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
console.log('✅ Đã tạo thành công 2 file CV Scan!');
