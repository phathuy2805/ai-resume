// Explicit local development server, never imported by the application/build.
// PDF outcomes are scripted by filename; this is not a PDF parser or real auth.
import { createServer } from 'node:http';

const port = Number(process.env.CANDIDATE_MOCK_PORT || 3106);
const now = new Date().toISOString();
const users = {
  candidate: {
    id: 'demo-candidate',
    fullName: 'Ứng viên Demo',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
    createdAt: now,
  },
  hr: {
    id: 'demo-hr',
    fullName: 'Nhà tuyển dụng Demo',
    email: 'hr@example.com',
    role: 'HR',
    createdAt: now,
  },
};
const jobs = [
  'Backend Developer',
  'Frontend Developer',
  'Data Analyst',
  'Digital Marketer',
  'QA Engineer',
  'DevOps Engineer',
  'Product Designer',
  'Backend Intern',
].map((title, index) => ({
  id: `demo-job-${index + 1}`,
  title,
  description:
    'Tham gia phát triển sản phẩm và phối hợp cùng nhóm.\nTrao đổi yêu cầu, triển khai và kiểm tra chất lượng công việc.',
  requiredSkills: index < 2 ? ['TypeScript', 'Git'] : ['Phân tích', 'Giao tiếp'],
  preferredSkills: ['Tiếng Anh'],
  minYearsExperience: 2,
  level: 'Middle',
  status: 'OPEN',
  cvPassThreshold: 70,
  interviewQuestionCount: 3,
  createdById: users.hr.id,
  createdAt: now,
  updatedAt: now,
}));
jobs.push({ ...jobs[0], id: 'demo-closed', title: 'Vị trí đã đóng', status: 'CLOSED' });
const applications = [];
const MAX_BYTES = 5 * 1024 * 1024;
const cookie = (role) => `refresh_token=${role}; HttpOnly; Path=/api/auth; SameSite=Lax`;
const failure = (res, status, message, code) =>
  send(res, status, { statusCode: status, message, ...(code ? { code } : {}) });
function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  let size = 0;
  const parts = [];
  for await (const part of req) {
    size += part.length;
    if (size > MAX_BYTES + 65536) throw new Error('TOO_LARGE');
    parts.push(part);
  }
  return Buffer.concat(parts);
}
createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const path = url.pathname;
  const role = req.headers.authorization?.replace('Bearer demo-', '');
  const user = users[role];
  try {
    if (req.method === 'POST' && path === '/api/auth/login') {
      const data = JSON.parse((await readBody(req)).toString());
      const found = Object.entries(users).find(([, value]) => value.email === data.email);
      if (!found || data.password !== 'Demo12345!')
        return failure(res, 401, 'Email hoặc mật khẩu không đúng');
      res.setHeader('Set-Cookie', cookie(found[0]));
      return send(res, 200, { data: { accessToken: `demo-${found[0]}`, user: found[1] } });
    }
    if (req.method === 'POST' && path === '/api/auth/refresh') {
      const saved = /(?:^|;\s*)refresh_token=(candidate|hr)(?:;|$)/.exec(
        req.headers.cookie ?? '',
      )?.[1];
      if (!saved) return failure(res, 401, 'Thiếu refresh token');
      return send(res, 200, { data: { accessToken: `demo-${saved}`, user: users[saved] } });
    }
    if (req.method === 'POST' && path === '/api/auth/logout') {
      res.setHeader('Set-Cookie', `${cookie('')}; Max-Age=0`);
      return send(res, 200, { data: { message: 'Đã đăng xuất' } });
    }
    if (req.method === 'GET' && path === '/api/auth/me') {
      return user ? send(res, 200, { data: user }) : failure(res, 401, 'Vui lòng đăng nhập');
    }
    if (req.method === 'GET' && path === '/api/jobs') {
      const page = Number(url.searchParams.get('page') || 1);
      const limit = Number(url.searchParams.get('limit') || 6);
      if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
      )
        return failure(res, 400, 'Phân trang không hợp lệ');
      const query = (url.searchParams.get('search') ?? '').toLowerCase();
      const filtered = jobs.filter(
        (job) =>
          (!url.searchParams.has('status') || job.status === url.searchParams.get('status')) &&
          job.title.toLowerCase().includes(query),
      );
      return send(res, 200, {
        data: filtered.slice((page - 1) * limit, page * limit),
        meta: { page, limit, total: filtered.length },
      });
    }
    const jobId = /^\/api\/jobs\/([^/]+)(?:\/applications)?$/.exec(path)?.[1];
    const job = jobs.find((item) => item.id === jobId);
    if (req.method === 'GET' && jobId)
      return job ? send(res, 200, { data: job }) : failure(res, 404, 'Không tìm thấy việc làm');
    if (req.method === 'GET' && path === '/api/me/applications') {
      if (!user) return failure(res, 401, 'Vui lòng đăng nhập');
      if (user.role !== 'CANDIDATE') return failure(res, 403, 'Chỉ dành cho ứng viên');
      return send(res, 200, {
        data: applications
          .filter((app) => app.candidateId === user.id)
          .map(({ candidateId: _id, ...app }) => app),
      });
    }
    if (req.method === 'POST' && path.endsWith('/applications')) {
      if (!user) return failure(res, 401, 'Vui lòng đăng nhập');
      if (user.role !== 'CANDIDATE') return failure(res, 403, 'Chỉ dành cho ứng viên');
      if (!job) return failure(res, 404, 'Không tìm thấy việc làm');
      if (job.status !== 'OPEN') return failure(res, 409, 'Job đã đóng', 'JOB_CLOSED');
      if (applications.some((app) => app.candidateId === user.id && app.job.id === job.id))
        return failure(res, 409, 'Đã nộp hồ sơ', 'ALREADY_APPLIED');
      const body = await readBody(req);
      const filename = /name="file";\s*filename="([^"]+)"/.exec(body.toString('utf8'))?.[1];
      if (!filename || !/\.pdf$/i.test(filename)) return failure(res, 400, 'Chỉ nhận file PDF');
      const code = /(?:scanned|cv_scan)/i.test(filename)
        ? 'SCANNED'
        : ['ENCRYPTED', 'CORRUPTED', 'EMPTY', 'TOO_MANY_PAGES'].find((code) =>
            filename.toUpperCase().includes(code),
          );
      // A visible processing interval verifies that 100% upload is not success.
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (code) return failure(res, 422, 'CV không hợp lệ (kịch bản mock)', code);
      if (applications.some((app) => app.candidateId === user.id && app.job.id === job.id))
        return failure(res, 409, 'Đã nộp hồ sơ', 'ALREADY_APPLIED');
      const result = {
        id: `demo-app-${applications.length + 1}`,
        job: { id: job.id, title: job.title },
        status: 'SUBMITTED',
        cvFileName: filename,
        cvSizeBytes: body.length,
        cvMimeType: 'application/pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      applications.push({ ...result, candidateId: user.id });
      return send(res, 201, { data: result });
    }
    return failure(res, 404, 'Không có endpoint này trong mock FE-06');
  } catch (error) {
    return failure(res, error.message === 'TOO_LARGE' ? 413 : 400, 'Request không hợp lệ');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(
    `FE-06 MOCK ONLY: http://127.0.0.1:${port}. Data resets on restart; PDF outcomes are filename scripts.`,
  );
});
