import type { Application, Job, JobForm, ResumeProfile, Stats, User } from './demoData'
import {
  demoJobs,
  demoPasswords,
  demoResume,
  demoResumeAdvice,
  demoUsers,
  emptyResume,
} from './demoData'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const STORAGE_KEYS = {
  user: 'ccofferhub_demo_user',
  favorites: 'ccofferhub_demo_favorites',
  applications: 'ccofferhub_demo_applications',
  resume: 'ccofferhub_demo_resume',
  jobs: 'ccofferhub_demo_jobs',
  advice: 'ccofferhub_demo_resume_advice',
}

const load = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return clone(fallback)
  const raw = window.localStorage.getItem(key)
  if (!raw) return clone(fallback)
  try {
    return JSON.parse(raw) as T
  } catch {
    return clone(fallback)
  }
}

const save = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const getStoredJobs = () => load<Job[]>(STORAGE_KEYS.jobs, demoJobs)
const setStoredJobs = (jobs: Job[]) => save(STORAGE_KEYS.jobs, jobs)
const getDefaultFavorites = () => [] as number[]
const getDefaultApplications = () => [] as Application[]

export const getStats = (): Stats => {
  const jobs = getStoredJobs()
  return {
    total_jobs: jobs.length,
    total_companies: new Set(jobs.map((job) => job.company_name)).size,
    total_cities: new Set(jobs.map((job) => job.city)).size,
    today_new: Math.min(8, jobs.length),
  }
}

export const getJobs = (filters?: {
  keyword?: string
  city?: string
  category?: string
  recruitmentType?: string
}) => {
  const keyword = filters?.keyword?.trim().toLowerCase() || ''
  const city = filters?.city || ''
  const category = filters?.category || ''
  const recruitmentType = filters?.recruitmentType || ''

  return getStoredJobs().filter((job) => {
    const matchKeyword = !keyword || `${job.company_name} ${job.title}`.toLowerCase().includes(keyword)
    const matchCity = !city || job.city === city
    const matchCategory = !category || job.category === category
    const matchRecruitmentType = !recruitmentType || job.recruitment_type === recruitmentType
    return matchKeyword && matchCity && matchCategory && matchRecruitmentType
  })
}

export const login = (username: string, password: string): User | null => {
  const matched = demoUsers.find((user) => user.username === username && demoPasswords[user.username] === password)
  if (!matched) return null
  save(STORAGE_KEYS.user, matched)
  return matched
}

export const register = (username: string, password: string) => {
  if (!username.trim() || !password.trim()) {
    return { ok: false, message: '请填写用户名和密码' }
  }
  return { ok: true, message: '演示版已关闭真实注册，直接使用 demo / admin 账号体验即可。' }
}

export const getStoredUser = () => load<User | null>(STORAGE_KEYS.user, null)
export const logout = () => save(STORAGE_KEYS.user, null)

export const getFavorites = () => {
  const ids = load<number[]>(STORAGE_KEYS.favorites, getDefaultFavorites())
  const jobs = getStoredJobs().filter((job) => ids.includes(job.id))
  return { ids, jobs }
}

export const toggleFavorite = (jobId: number) => {
  const ids = load<number[]>(STORAGE_KEYS.favorites, getDefaultFavorites())
  const next = ids.includes(jobId) ? ids.filter((id) => id !== jobId) : [...ids, jobId]
  save(STORAGE_KEYS.favorites, next)
  return next
}

export const getApplications = () => load<Application[]>(STORAGE_KEYS.applications, getDefaultApplications())

export const updateApplication = (jobId: number, status: string) => {
  const jobs = getStoredJobs()
  const job = jobs.find((item) => item.id === jobId)
  if (!job) return getApplications()
  const applications = load<Application[]>(STORAGE_KEYS.applications, getDefaultApplications())
  const existing = applications.find((item) => item.job_id === jobId)
  if (existing) {
    existing.status = status
  } else {
    applications.unshift({
      id: Date.now(),
      job_id: job.id,
      title: job.title,
      company_name: job.company_name,
      city: job.city,
      status,
    })
  }
  save(STORAGE_KEYS.applications, applications)
  return applications
}

export const getResume = () => load<ResumeProfile>(STORAGE_KEYS.resume, demoResume)
export const saveResume = (resume: ResumeProfile) => save(STORAGE_KEYS.resume, resume)
export const getResumeAdvice = () => load<string>(STORAGE_KEYS.advice, demoResumeAdvice)

export const generateResumeAdvice = (resume: ResumeProfile, targetJD: string) => {
  const summary = [
    `1. 当前目标岗位是“${resume.target_role || '待补充'}”，建议把项目经历里的关键词和岗位名称对齐。`,
    `2. 技能栈里优先保留最能支撑岗位的技术点：${resume.skills || '请补充技能栈'}。`,
    `3. 项目经历建议写结果，少写空话。比如页面优化、功能落地、部署上线、数据指标变化。`,
    `4. ${targetJD ? `你已经补充了目标 JD，可以重点贴合其中的关键词：${targetJD.slice(0, 48)}...` : '如果有目标 JD，可以粘贴进来再做一次更针对性的优化。'}`,
  ].join('\n\n')
  save(STORAGE_KEYS.advice, summary)
  return summary
}

export const exportResumePdf = (resume: ResumeProfile) => {
  const text = [
    resume.full_name || '你的姓名',
    `${resume.target_role || '目标岗位'} | ${resume.city || '目标城市'} | ${resume.phone || '手机号'} | ${resume.email || '邮箱'}`,
    '',
    '教育背景',
    resume.education || '',
    '',
    '技能栈',
    resume.skills || '',
    '',
    '项目经历',
    resume.projects || '',
    '',
    '实习 / 校园经历',
    resume.experience || '',
    '',
    '个人优势',
    resume.strengths || '',
  ].join('\n')
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${resume.full_name || 'resume'}-demo.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export const getAdminJobs = () => getStoredJobs().slice(0, 200)

export const saveAdminJob = (payload: JobForm, editingId: number | null) => {
  const jobs = getStoredJobs()
  if (editingId) {
    const idx = jobs.findIndex((job) => job.id === editingId)
    if (idx >= 0) {
      jobs[idx] = { ...jobs[idx], ...payload }
    }
  } else {
    jobs.unshift({
      id: Date.now(),
      ...payload,
    })
  }
  setStoredJobs(jobs)
  return jobs
}

export const deleteAdminJob = (jobId: number) => {
  const jobs = getStoredJobs().filter((job) => job.id !== jobId)
  setStoredJobs(jobs)
  return jobs
}

export const importAdminCsv = async (file: File) => {
  const text = await file.text()
  const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean)
  if (rows.length <= 1) return { created: 0 }
  const jobs = getStoredJobs()
  const headers = rows[0].split(',').map((item) => item.trim())
  let created = 0
  for (const row of rows.slice(1)) {
    const cols = row.split(',')
    const mapped = Object.fromEntries(headers.map((header, index) => [header, cols[index]?.trim() || ''])) as Record<string, string>
    jobs.unshift({
      id: Date.now() + created,
      company_name: mapped.company_name || mapped.company || '未命名公司',
      title: mapped.title || '未命名岗位',
      city: mapped.city || '待补充',
      category: mapped.category || '其他',
      recruitment_type: mapped.recruitment_type || mapped.type || '校招',
      degree: mapped.degree || '本科及以上',
      description: mapped.description || '待补充岗位描述',
      requirements: mapped.requirements || '待补充岗位要求',
      deadline: mapped.deadline || '长期有效',
      source_name: mapped.source_name || 'CSV 导入',
      source_url: mapped.source_url || 'https://example.com',
    })
    created += 1
  }
  setStoredJobs(jobs)
  return { created }
}

export const resetDemoState = () => {
  save(STORAGE_KEYS.user, null)
  save(STORAGE_KEYS.favorites, getDefaultFavorites())
  save(STORAGE_KEYS.applications, getDefaultApplications())
  save(STORAGE_KEYS.resume, demoResume)
  save(STORAGE_KEYS.jobs, demoJobs)
  save(STORAGE_KEYS.advice, demoResumeAdvice)
}

export const getEmptyResume = () => clone(emptyResume)
