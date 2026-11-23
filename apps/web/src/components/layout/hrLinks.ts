import { BarChart3, BriefcaseBusiness, Users } from 'lucide-react';

/** Trang ứng viên: /hr/candidates, /hr/jobs/:jobId/candidates và chi tiết hồ sơ /hr/applications/:id. */
const isCandidatesPath = (pathname: string) =>
  pathname.startsWith('/hr/candidates') ||
  pathname.startsWith('/hr/applications') ||
  /^\/hr\/jobs\/[^/]+\/candidates/.test(pathname);

export const hrLinks = [
  {
    to: '/hr/jobs',
    label: 'Tin tuyển dụng',
    icon: BriefcaseBusiness,
    match: (pathname: string) => pathname.startsWith('/hr/jobs') && !isCandidatesPath(pathname),
  },
  { to: '/hr/candidates', label: 'Ứng viên', icon: Users, match: isCandidatesPath },
  {
    to: '/hr/stats',
    label: 'Thống kê',
    icon: BarChart3,
    match: (pathname: string) => pathname.startsWith('/hr/stats'),
  },
];

export function getActiveHrLink(pathname: string) {
  return hrLinks.find((link) => link.match(pathname));
}
