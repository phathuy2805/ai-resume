import { BarChart3, Building2, BriefcaseBusiness, Users } from 'lucide-react';

/** Trang ứng viên: /hr/candidates, /hr/jobs/:jobId/candidates và chi tiết hồ sơ /hr/applications/:id. */
const isCandidatesPath = (pathname: string) =>
  pathname.startsWith('/hr/candidates') ||
  pathname.startsWith('/hr/applications') ||
  /^\/hr\/jobs\/[^/]+\/candidates/.test(pathname);

export const hrLinks = [
  {
    group: 'recruiting',
    to: '/hr/jobs',
    label: 'Tin tuyển dụng',
    icon: BriefcaseBusiness,
    match: (pathname: string) => pathname.startsWith('/hr/jobs') && !isCandidatesPath(pathname),
  },
  {
    group: 'recruiting',
    to: '/hr/candidates',
    label: 'Ứng viên',
    icon: Users,
    match: isCandidatesPath,
  },
  {
    group: 'recruiting',
    to: '/hr/stats',
    label: 'Thống kê',
    icon: BarChart3,
    match: (pathname: string) => pathname.startsWith('/hr/stats'),
  },
  {
    group: 'settings',
    to: '/hr/company',
    label: 'Thông tin công ty',
    icon: Building2,
    match: (pathname: string) => pathname.startsWith('/hr/company'),
  },
] as const;

export const hrLinkGroups = [
  { id: 'recruiting', label: 'Tuyển dụng' },
  { id: 'settings', label: 'Cài đặt' },
] as const;

export function getActiveHrLink(pathname: string) {
  return hrLinks.find((link) => link.match(pathname));
}
