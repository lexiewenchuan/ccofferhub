import { useEffect, useMemo, useState } from 'react'
import './index.css'
import {
  deleteAdminJob as deleteAdminJobLocal,
  exportResumePdf,
  generateResumeAdvice,
  getAdminJobs,
  getApplications,
  getFavorites,
  getJobs,
  getResume,
  getResumeAdvice,
  getStats,
  getStoredUser,
  importAdminCsv,
  login,
  logout,
  register,
  saveAdminJob as saveAdminJobLocal,
  saveResume as saveResumeLocal,
  toggleFavorite as toggleFavoriteLocal,
  updateApplication as updateApplicationLocal,
} from './demoApi'
import {
  emptyJobForm,
  emptyResume,
  statusOptions,
  type Application,
  type Job,
  type JobForm,
  type ResumeProfile,
  type Stats,
  type User,
} from './demoData'

type View = 'home' | 'resume' | 'favorites' | 'applications' | 'admin' | 'auth'

const PAGE_SIZE = 12
const STATUS_ORDER = ['saved', 'applied', 'written_test', 'interview', 'offer']

const VIEW_TITLE: Record<View, string> = {
  home: '岗位大厅',
  resume: '个人简历',
  favorites: '我的收藏',
  applications: '投递进度',
  admin: '管理后台',
  auth: '登录 / 注册',
}

const categoryTagClass = (category: string) => {
  const c = category || ''
  if (/技术|开发|算法|工程师|后端|前端|测试/.test(c)) return 'tech'
  if (/产品|PM/.test(c)) return 'product'
  if (/设计|视觉|UI|UX/.test(c)) return 'design'
  if (/数据|分析/.test(c)) return 'data'
  if (/运营|增长|市场/.test(c)) return 'ops'
  return 'all'
}

const logoText = (name: string) => (name ? name.trim().charAt(0) : '·')
const userInitial = (name?: string) => (name ? name.trim().charAt(0).toUpperCase() : 'D')

function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [message, setMessage] = useState('')
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [recruitmentType, setRecruitmentType] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [view, setView] = useState<View>('home')
  const [user, setUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ username: '', password: '', email: '' })
  const [favorites, setFavorites] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [resume, setResume] = useState<ResumeProfile>(emptyResume)
  const [resumeAdvice, setResumeAdvice] = useState('')
  const [targetJD, setTargetJD] = useState('')
  const [jobForm, setJobForm] = useState<JobForm>(emptyJobForm)
  const [adminJobs, setAdminJobs] = useState<Job[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [cmdkOpen, setCmdkOpen] = useState(false)

  const cities = useMemo(() => [...new Set(jobs.map((j) => j.city))].filter(Boolean).sort(), [jobs])
  const recruitmentTypes = useMemo(() => [...new Set(jobs.map((j) => j.recruitment_type))].filter(Boolean).sort(), [jobs])
  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE))
  const pagedJobs = useMemo(() => jobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [jobs, currentPage])
  const applicationByJob = useMemo(() => {
    const map = new Map<number, Application>()
    applications.forEach((a) => map.set(a.job_id, a))
    return map
  }, [applications])

  const heroStats = useMemo(() => {
    if (!stats) {
      return [
        { label: '岗位总数', value: '--', trend: '--' },
        { label: '覆盖公司', value: '--', trend: '--' },
        { label: '覆盖城市', value: '--', trend: '--' },
        { label: '今日新增', value: '--', trend: '--' },
      ]
    }
    return [
      { label: '岗位总数', value: stats.total_jobs, trend: `↑ +${stats.today_new} 今日` },
      { label: '覆盖公司', value: stats.total_companies, trend: '↑ +6 本周' },
      { label: '覆盖城市', value: stats.total_cities, trend: '— 持平' },
      { label: '今日新增', value: stats.today_new, trend: '↑ 比昨日 +18%' },
    ]
  }, [stats])

  const toast = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2400)
  }

  const fetchStats = async () => {
    setStats(getStats())
  }

  const fetchJobs = async () => {
    setJobsLoading(true)
    const data = getJobs({ keyword, city, category, recruitmentType })
    setJobs(data)
    setSelectedJob((prev) => data.find((item) => item.id === prev?.id) || data[0] || null)
    setCurrentPage(1)
    setJobsLoading(false)
  }

  const fetchFavorites = async () => {
    const data = getFavorites()
    setFavorites(data.jobs)
    setFavoriteIds(new Set(data.ids))
  }

  const fetchApplications = async () => {
    setApplications(getApplications())
  }

  const fetchResume = async () => {
    setResume({ ...emptyResume, ...getResume() })
    setResumeAdvice(getResumeAdvice())
  }

  const fetchAdminJobs = async () => {
    setAdminJobs(getAdminJobs())
  }

  useEffect(() => {
    setUser(getStoredUser())
    fetchJobs()
    fetchStats()
  }, [])

  useEffect(() => {
    if (!user) return
    fetchFavorites()
    fetchApplications()
    fetchResume()
    if (user.role === 'admin') fetchAdminJobs()
  }, [user])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdkOpen((v) => !v)
      }
      if (e.key === 'Escape') setCmdkOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const submitAuth = async () => {
    if (authMode === 'register') {
      const result = register(authForm.username, authForm.password)
      toast(result.message)
      if (result.ok) setAuthMode('login')
      return
    }
    const matched = login(authForm.username, authForm.password)
    if (!matched) return toast('用户名或密码错误')
    setUser(matched)
    setView('home')
    toast(`欢迎回来，${matched.username}`)
  }

  const toggleFavorite = async (jobId: number) => {
    if (!user) return toast('请先登录')
    const hasFavorite = favoriteIds.has(jobId)
    toggleFavoriteLocal(jobId)
    await fetchFavorites()
    toast(hasFavorite ? '已取消收藏' : '已加入收藏')
  }

  const updateApplication = async (jobId: number, status: string) => {
    if (!user) return toast('请先登录')
    updateApplicationLocal(jobId, status)
    await fetchApplications()
    toast('投递进度已更新')
  }

  const saveResume = async () => {
    if (!user) return toast('请先登录')
    saveResumeLocal(resume)
    toast('简历信息已保存')
  }

  const optimizeResume = async () => {
    if (!user) return toast('请先登录')
    const advice = generateResumeAdvice(resume, targetJD)
    setResumeAdvice(advice)
    toast('AI 优化建议已生成')
  }

  const exportResumePdfAction = async () => {
    if (!user) return toast('请先登录')
    exportResumePdf(resume)
    toast('已导出演示版文本简历')
  }

  const saveAdminJob = async () => {
    if (!user) return toast('请先登录')
    saveAdminJobLocal(jobForm, editingId)
    toast(editingId ? '岗位已更新' : '岗位已新增')
    setEditingId(null)
    setJobForm(emptyJobForm)
    fetchAdminJobs()
    fetchJobs()
    fetchStats()
  }

  const editAdminJob = (job: Job) => {
    setEditingId(job.id)
    setJobForm({
      company_name: job.company_name,
      title: job.title,
      city: job.city,
      category: job.category,
      recruitment_type: job.recruitment_type,
      degree: job.degree,
      description: job.description,
      requirements: job.requirements,
      deadline: job.deadline,
      source_name: job.source_name,
      source_url: job.source_url,
    })
    setView('admin')
  }

  const deleteAdminJob = async (jobId: number) => {
    if (!user) return
    deleteAdminJobLocal(jobId)
    toast('岗位已删除')
    fetchAdminJobs()
    fetchJobs()
    fetchStats()
  }

  const uploadCsv = async () => {
    if (!user || !csvFile) return toast('请选择 CSV 文件')
    const data = await importAdminCsv(csvFile)
    toast(`导入成功：${data.created} 条`)
    fetchAdminJobs()
    fetchJobs()
    fetchStats()
  }

  const clearFilters = () => {
    setKeyword('')
    setCity('')
    setCategory('')
    setRecruitmentType('')
    window.setTimeout(fetchJobs, 50)
  }

  const currentStatusIndex = selectedJob ? STATUS_ORDER.indexOf(applicationByJob.get(selectedJob.id)?.status || 'saved') : 0

  const renderPagination = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 4) pages.push('...')
      for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) pages.push(page)
      if (currentPage < totalPages - 3) pages.push('...')
      pages.push(totalPages)
    }

    return (
      <div className="pagination-bar">
        <div className="pagination-summary">第 {currentPage} / {totalPages} 页</div>
        <div className="pagination-pages">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>上一页</button>
          {pages.map((page, idx) => page === '...'
            ? <span key={`dots-${idx}`} className="page-dots">...</span>
            : <button key={page} className={page === currentPage ? 'active' : ''} onClick={() => setCurrentPage(page as number)}>{page}</button>)}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>下一页</button>
        </div>
      </div>
    )
  }

  const renderResumePreview = () => (
    <div className="resume-paper">
      <div className="resume-paper-head">
        <h2>{resume.full_name || '你的姓名'}</h2>
        <p>{resume.target_role || '目标岗位'} · {resume.city || '目标城市'}</p>
        <span>{resume.phone || '手机号'} · {resume.email || '邮箱'}</span>
      </div>
      <div className="resume-paper-section"><h4>教育背景</h4><p>{resume.education || '填写教育经历、院校、专业、毕业时间等内容。'}</p></div>
      <div className="resume-paper-section"><h4>技能栈</h4><p>{resume.skills || '填写技能栈，例如 React / Python / SQL / 数据分析 / 算法等。'}</p></div>
      <div className="resume-paper-section"><h4>项目经历</h4><p>{resume.projects || '填写项目名称、职责、成果和亮点。'}</p></div>
      <div className="resume-paper-section"><h4>实习 / 校园经历</h4><p>{resume.experience || '填写实习、比赛、社团、科研等可展示经历。'}</p></div>
      <div className="resume-paper-section"><h4>个人优势</h4><p>{resume.strengths || '填写你的优势，例如学习快、执行力强、做过项目、有数据意识等。'}</p></div>
    </div>
  )

  const renderResumePage = () => (
    <div className="stack">
      <div className="pink-page-head">
        <div>
          <div className="eyebrow">Resume Builder</div>
          <h1>{VIEW_TITLE.resume}</h1>
        </div>
        <div className="page-meta-row">
          <span>{resume.full_name ? '已创建简历' : '待填写'}</span>
          <span>{resumeAdvice ? '建议已生成' : '可生成建议'}</span>
        </div>
      </div>

      {!user && (
        <div className="glass-card soft-empty-card">
          <h4>登录后可使用个人简历模块</h4>
          <p>请先登录，再保存简历信息、生成建议与导出演示版简历。</p>
        </div>
      )}

      <div className="resume-grid">
        <div className="glass-card panel-card">
          <div className="panel-head"><h3>简历信息</h3></div>
          <div className="form-grid">
            <input value={resume.full_name} placeholder="姓名" onChange={(e) => setResume({ ...resume, full_name: e.target.value })} />
            <input value={resume.target_role} placeholder="目标岗位" onChange={(e) => setResume({ ...resume, target_role: e.target.value })} />
            <input value={resume.phone} placeholder="手机号" onChange={(e) => setResume({ ...resume, phone: e.target.value })} />
            <input value={resume.email} placeholder="邮箱" onChange={(e) => setResume({ ...resume, email: e.target.value })} />
            <input value={resume.city} placeholder="意向城市" onChange={(e) => setResume({ ...resume, city: e.target.value })} />
            <textarea className="full-span" value={resume.education} placeholder="教育背景" onChange={(e) => setResume({ ...resume, education: e.target.value })} />
            <textarea className="full-span" value={resume.skills} placeholder="技能栈" onChange={(e) => setResume({ ...resume, skills: e.target.value })} />
            <textarea className="full-span" value={resume.projects} placeholder="项目经历" onChange={(e) => setResume({ ...resume, projects: e.target.value })} />
            <textarea className="full-span" value={resume.experience} placeholder="实习 / 校园经历" onChange={(e) => setResume({ ...resume, experience: e.target.value })} />
            <textarea className="full-span" value={resume.strengths} placeholder="个人优势" onChange={(e) => setResume({ ...resume, strengths: e.target.value })} />
            <textarea className="full-span" value={targetJD} placeholder="可选：粘贴目标岗位 JD，让 AI 给出更针对性的优化建议" onChange={(e) => setTargetJD(e.target.value)} />
          </div>
          <div className="toolbar-row">
            <button className="cta-btn" onClick={saveResume}>保存简历信息</button>
            <button className="secondary-btn" onClick={optimizeResume}>AI 优化简历</button>
            <button className="secondary-btn" onClick={exportResumePdfAction}>导出 PDF</button>
          </div>
        </div>

        <div className="stack">
          <div className="glass-card panel-card">
            <div className="panel-head"><h3>优化建议</h3></div>
            <pre className="advice-box">{resumeAdvice || '暂无内容'}</pre>
          </div>
          <div className="glass-card panel-card">
            <div className="panel-head"><h3>一页预览</h3></div>
            {renderResumePreview()}
          </div>
        </div>
      </div>
    </div>
  )

  const renderFavoritesPage = () => (
    <div className="stack">
      <div className="pink-page-head"><div><div className="eyebrow">Favorites</div><h1>{VIEW_TITLE.favorites}</h1></div><span className="head-pill">{favorites.length} 条</span></div>
      <div className="glass-card panel-card simple-list">
        {favorites.map((job) => (
          <div key={job.id} className="soft-row-card simple-item">
            <div>
              <strong>{job.title}</strong>
              <p>{job.company_name} · {job.city}</p>
            </div>
            <a className="secondary-btn inline-btn" href={job.source_url} target="_blank" rel="noreferrer">立即投递</a>
          </div>
        ))}
        {!favorites.length && <div className="soft-empty-card"><h4>还没有收藏岗位</h4><p>在岗位详情里点击“加入收藏”即可在这里查看。</p></div>}
      </div>
    </div>
  )

  const renderApplicationsPage = () => (
    <div className="stack">
      <div className="pink-page-head"><div><div className="eyebrow">Pipeline</div><h1>{VIEW_TITLE.applications}</h1></div><span className="head-pill">{applications.length} 条</span></div>
      <div className="glass-card panel-card simple-list">
        {applications.map((item) => (
          <div key={item.id} className="soft-row-card simple-item column align-start">
            <div>
              <strong>{item.title}</strong>
              <p>{item.company_name} · {item.city}</p>
            </div>
            <div className="status-chip active">{statusOptions.find((s) => s.value === item.status)?.label || item.status}</div>
          </div>
        ))}
        {!applications.length && <div className="soft-empty-card"><h4>还没有记录投递进度</h4><p>在岗位详情中点击进度步骤，就会同步出现在这里。</p></div>}
      </div>
    </div>
  )

  const renderAdminPage = () => (
    <div className="stack">
      <div className="pink-page-head"><div><div className="eyebrow">Admin</div><h1>{VIEW_TITLE.admin}</h1></div><span className="head-pill">{adminJobs.length} 条岗位</span></div>
      <div className="glass-card panel-card">
        <div className="panel-head"><h3>{editingId ? '编辑岗位' : '新增岗位'}</h3><span>{editingId ? `ID ${editingId}` : '手动录入'}</span></div>
        <div className="form-grid">
          <input placeholder="公司名称" value={jobForm.company_name} onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })} />
          <input placeholder="岗位名称" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
          <input placeholder="城市" value={jobForm.city} onChange={(e) => setJobForm({ ...jobForm, city: e.target.value })} />
          <input placeholder="岗位类别" value={jobForm.category} onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })} />
          <input placeholder="招聘类型" value={jobForm.recruitment_type} onChange={(e) => setJobForm({ ...jobForm, recruitment_type: e.target.value })} />
          <input placeholder="学历要求" value={jobForm.degree} onChange={(e) => setJobForm({ ...jobForm, degree: e.target.value })} />
          <input placeholder="截止时间" value={jobForm.deadline} onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })} />
          <input placeholder="来源名称" value={jobForm.source_name} onChange={(e) => setJobForm({ ...jobForm, source_name: e.target.value })} />
          <input className="full-span" placeholder="来源链接" value={jobForm.source_url} onChange={(e) => setJobForm({ ...jobForm, source_url: e.target.value })} />
          <textarea className="full-span" placeholder="岗位描述" value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
          <textarea className="full-span" placeholder="岗位要求" value={jobForm.requirements} onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })} />
        </div>
        <div className="toolbar-row">
          <button className="cta-btn" onClick={saveAdminJob}>{editingId ? '保存修改' : '新增岗位'}</button>
          <button className="secondary-btn" onClick={() => { setEditingId(null); setJobForm(emptyJobForm) }}>清空</button>
        </div>
      </div>

      <div className="glass-card panel-card">
        <div className="panel-head"><h3>CSV 导入</h3><span>支持批量扩充岗位库</span></div>
        <div className="toolbar-row wrap">
          <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
          <button className="cta-btn" onClick={uploadCsv}>上传导入</button>
        </div>
      </div>

      <div className="glass-card panel-card">
        <div className="panel-head"><h3>后台岗位管理</h3><span>{adminJobs.length} 条</span></div>
        <div className="admin-table">
          {adminJobs.map((job) => (
            <div className="soft-row-card admin-row" key={job.id}>
              <div>
                <strong>{job.title}</strong>
                <p>{job.company_name} · {job.city} · {job.source_name}</p>
              </div>
              <div className="row-actions">
                <span>{job.recruitment_type}</span>
                <button className="secondary-btn small" onClick={() => editAdminJob(job)}>编辑</button>
                <button className="danger-btn small" onClick={() => deleteAdminJob(job.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderAuthPage = () => (
    <div className="auth-wrap">
      <div className="glass-card auth-card">
        <div className="panel-head">
          <h3>{authMode === 'login' ? '登录账号' : '注册账号'}</h3>
          <button className="secondary-btn small" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? '去注册' : '去登录'}
          </button>
        </div>
        <div className="form-grid single">
          <input placeholder="用户名" value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })} />
          {authMode === 'register' && <input placeholder="邮箱" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />}
          <input type="password" placeholder="密码" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
        </div>
        <div className="toolbar-row">
          <button className="cta-btn" onClick={submitAuth}>{authMode === 'login' ? '登录' : '注册'}</button>
        </div>
        <div className="demo-box">
          <p><strong>演示账号</strong></p>
          <p>普通用户：demo / demo123456</p>
          <p>管理员：admin / admin123456</p>
        </div>
      </div>
    </div>
  )

  const navItems = [
    { key: 'home' as const, label: '岗位大厅', badge: `${stats?.total_jobs ?? '--'}` },
    { key: 'favorites' as const, label: '我的收藏', badge: user ? `${favorites.length}` : '—' },
    { key: 'applications' as const, label: '投递进度', badge: user ? `${applications.length}` : '—' },
  ]

  const toolItems = [
    { key: 'resume' as const, label: '个人简历' },
    ...(user?.role === 'admin' ? [{ key: 'admin' as const, label: '管理后台' }] : []),
  ]

  const quickCategories = ['全部', '技术', '产品', '设计', '运营', '数据']

  return (
    <div className="pastel-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />

      <aside className="pastel-sidebar glass-card">
        <div className="brand-row">
          <div className="brand-logo">CC</div>
          <div>
            <div className="brand-title">ccofferhub</div>
            <div className="brand-subtitle">Career Hub</div>
          </div>
        </div>

        <button className="search-everything" onClick={() => setCmdkOpen(true)}>
          <span>搜索一切</span>
          <span className="kbd-soft">⌘K</span>
        </button>

        <div className="side-section-title">工作台</div>
        <div className="side-nav-list">
          {navItems.map((item) => (
            <button key={item.key} className={`side-nav-item ${view === item.key ? 'active' : ''}`} onClick={() => setView(item.key)}>
              <span>{item.label}</span>
              <span className="side-badge">{item.badge}</span>
            </button>
          ))}
        </div>

        <div className="side-section-title">工具</div>
        <div className="side-nav-list">
          {toolItems.map((item) => (
            <button key={item.key} className={`side-nav-item ${view === item.key ? 'active' : ''}`} onClick={() => setView(item.key)}>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="side-user-card glass-card-inner">
          {user ? (
            <>
              <div className="side-avatar">{userInitial(user.username)}</div>
              <div className="side-user-copy">
                <div className="side-user-name">{user.username}</div>
                <div className="side-user-role">{user.role === 'admin' ? '管理员' : '普通用户'}</div>
              </div>
              <button className="logout-soft" onClick={() => { logout(); setUser(null); setView('home') }}>↗</button>
            </>
          ) : (
            <div className="guest-actions">
              <button className="secondary-btn full" onClick={() => { setAuthMode('login'); setView('auth') }}>登录</button>
              <button className="cta-btn full" onClick={() => { setAuthMode('register'); setView('auth') }}>注册</button>
            </div>
          )}
        </div>
      </aside>

      <main className="pastel-main">
        <header className="top-ribbon glass-card">
          <div className="crumbs">工作台 <span>›</span> {VIEW_TITLE[view]}</div>
          <div className="ribbon-actions">
            {user ? <span className="notice-pill">通知 <em>{Math.min(applications.length + favorites.length, 9)}</em></span> : <span className="notice-pill muted">未登录</span>}
            <span className="status-pill"><i /> 已连接</span>
            {user ? <button className="cta-btn">＋ 一键投递</button> : <button className="secondary-btn" onClick={() => { setAuthMode('login'); setView('auth') }}>先登录再操作</button>}
          </div>
        </header>

        {message && <div className="toast-banner">{message}</div>}

        {view === 'home' && (
          <>
            <section className="hero-board glass-card">
              <div className="hero-copy">
                <div className="live-pill">2026 春招进行中 · 实时同步 {stats?.today_new ?? 47} 个新岗位</div>
                <h1>
                  找到对的<br />
                  <span>下一份 Offer</span>
                </h1>
                <p>聚合一线大厂校招与实习，统一筛选、收藏、投递与跟进，一份简历多端复用。</p>
                <div className="hero-actions">
                  <button className="cta-btn" onClick={() => setView('home')}>浏览全部岗位 →</button>
                  <button className="secondary-btn" onClick={() => setView('resume')}>完善我的简历</button>
                </div>
              </div>

              <div className="hero-stats-grid">
                {heroStats.map((item, index) => (
                  <div key={item.label} className={`hero-stat-card stat-${index + 1}`}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.trend}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="filter-ribbon glass-card">
              <div className="search-large">
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索公司、岗位、关键词..." />
              </div>
              <div className="filter-pills">
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">全部城市</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={recruitmentType} onChange={(e) => setRecruitmentType(e.target.value)}>
                  <option value="">全部学历</option>
                  {recruitmentTypes.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="quick-tabs">
                {quickCategories.map((item) => (
                  <button
                    key={item}
                    className={category === (item === '全部' ? '' : item) ? 'active' : ''}
                    onClick={() => setCategory(item === '全部' ? '' : item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="toolbar-row no-margin">
                <button className="cta-btn" onClick={fetchJobs}>查询</button>
                <button className="secondary-btn" onClick={clearFilters}>重置</button>
              </div>
            </section>

            <section className="content-panels">
              <div className="glass-card jobs-card-panel">
                <div className="panel-topbar">
                  <h3>岗位列表</h3>
                  <span>共 {jobs.length} 条</span>
                </div>

                <div className="jobs-table-head">
                  <span>岗位 / 公司</span>
                  <span>类别</span>
                  <span>城市</span>
                  <span>学历</span>
                </div>

                {jobsLoading ? (
                  <div className="skeleton-list">{Array.from({ length: 5 }).map((_, idx) => <div key={idx} className="skeleton-row soft" />)}</div>
                ) : jobs.length ? (
                  <div className="job-list soft-job-list">
                    {pagedJobs.map((job) => {
                      const status = applicationByJob.get(job.id)?.status || 'saved'
                      return (
                        <button key={job.id} className={`job-table-row ${selectedJob?.id === job.id ? 'active' : ''}`} onClick={() => setSelectedJob(job)}>
                          <div className="job-company-cell">
                            <div className={`company-orb ${categoryTagClass(job.category)}`}>{logoText(job.company_name)}</div>
                            <div>
                              <strong>{job.title}</strong>
                              <p>{job.company_name} · {job.recruitment_type} · {job.source_name}</p>
                            </div>
                          </div>
                          <span><em className={`chip-tag ${categoryTagClass(job.category)}`}>{job.category}</em></span>
                          <span>{job.city}</span>
                          <span>{job.degree}</span>
                          <div className="row-ops-soft">
                            <button className={`star-btn ${favoriteIds.has(job.id) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(job.id) }}>★</button>
                            <button className="arrow-btn" onClick={(e) => { e.stopPropagation(); setSelectedJob(job) }}>→</button>
                          </div>
                          <div className="row-status-float">{statusOptions.find((s) => s.value === status)?.label || '已收藏'}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="soft-empty-card">
                    <h4>当前筛选暂无匹配岗位</h4>
                    <p>你可以点击“重置”恢复全部岗位列表，或者换一个城市 / 类别继续筛选。</p>
                  </div>
                )}

                {renderPagination()}
              </div>

              <div className="glass-card preview-card-panel">
                <div className="panel-topbar">
                  <h3>岗位预览</h3>
                  <span>联动选中行</span>
                </div>

                {selectedJob ? (
                  <div className="preview-stack">
                    <div>
                      <h2>{selectedJob.title}</h2>
                      <p>{selectedJob.company_name} · {selectedJob.city} · {selectedJob.recruitment_type} · 来自 {selectedJob.source_name}</p>
                    </div>

                    <div className="chips">
                      <span className={`chip-tag ${categoryTagClass(selectedJob.category)}`}>{selectedJob.category}</span>
                      <span className="chip-tag neutral">{selectedJob.degree}</span>
                      <span className="chip-tag neutral">截止 {selectedJob.deadline}</span>
                      <span className="chip-tag neutral">应届优先</span>
                    </div>

                    <div className="white-content-card">
                      <h4>岗位描述</h4>
                      <p>{selectedJob.description}</p>
                    </div>

                    <div className="white-content-card">
                      <h4>岗位要求</h4>
                      <p>{selectedJob.requirements}</p>
                    </div>

                    <div className="progress-block soft-progress">
                      <div className="progress-head">
                        <h4>投递进度</h4>
                        <span>{statusOptions[Math.max(currentStatusIndex, 0)]?.label}</span>
                      </div>
                      <div className="progress-line">
                        {statusOptions.map((step, index) => (
                          <button key={step.value} className={`progress-step ${index <= currentStatusIndex ? 'active' : ''}`} onClick={() => updateApplication(selectedJob.id, step.value)}>
                            <span className="dot" />
                            <span>{step.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="toolbar-row">
                      <a className="cta-btn inline-btn" href={selectedJob.source_url} target="_blank" rel="noreferrer">前往真实投递入口</a>
                    </div>
                  </div>
                ) : (
                  <div className="soft-empty-card">
                    <h4>请选择一个岗位</h4>
                    <p>左侧列表点击任意岗位，即可在这里查看完整描述与投递入口。</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {view === 'resume' && renderResumePage()}
        {view === 'favorites' && renderFavoritesPage()}
        {view === 'applications' && renderApplicationsPage()}
        {view === 'admin' && renderAdminPage()}
        {view === 'auth' && !user && renderAuthPage()}

        {cmdkOpen && (
          <div className="cmdk-backdrop" onClick={() => setCmdkOpen(false)}>
            <div className="cmdk-modal pastel-cmdk" onClick={(e) => e.stopPropagation()}>
              <div className="cmdk-head">
                <input autoFocus placeholder="输入关键词，快速跳转模块" />
                <span className="kbd-soft">ESC</span>
              </div>
              <div className="cmdk-list">
                {[...navItems, ...toolItems].map((item) => (
                  <button
                    key={item.key}
                    className="cmdk-item"
                    onClick={() => {
                      setView(item.key)
                      setCmdkOpen(false)
                    }}
                  >
                    <span>{item.label}</span>
                    <span className="cmdk-meta">{VIEW_TITLE[item.key]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
