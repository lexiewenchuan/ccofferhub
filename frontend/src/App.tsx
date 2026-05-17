import { useEffect, useMemo, useState } from 'react'
import './index.css'

type Job = {
  id: number
  company_name: string
  title: string
  city: string
  category: string
  recruitment_type: string
  degree: string
  description: string
  requirements: string
  deadline: string
  source_name: string
  source_url: string
}

type User = {
  id: number
  username: string
  role: string
}

type Stats = {
  total_jobs: number
  total_companies: number
  total_cities: number
  today_new: number
}

type Application = {
  id: number
  job_id: number
  status: string
  title: string
  company_name: string
  city: string
}

type ResumeProfile = {
  full_name: string
  target_role: string
  phone: string
  email: string
  city: string
  education: string
  skills: string
  projects: string
  experience: string
  strengths: string
}

type View = 'home' | 'resume' | 'favorites' | 'applications' | 'admin' | 'auth'

type JobForm = {
  company_name: string
  title: string
  city: string
  category: string
  recruitment_type: string
  degree: string
  description: string
  requirements: string
  deadline: string
  source_name: string
  source_url: string
}

const API = window.location.origin
const PAGE_SIZE = 12

const statusOptions = [
  { value: 'saved', label: '已收藏' },
  { value: 'applied', label: '已投递' },
  { value: 'written_test', label: '笔试中' },
  { value: 'interview', label: '面试中' },
  { value: 'offer', label: '已拿 Offer' },
]

const emptyResume: ResumeProfile = {
  full_name: '',
  target_role: '',
  phone: '',
  email: '',
  city: '',
  education: '',
  skills: '',
  projects: '',
  experience: '',
  strengths: '',
}

const emptyJobForm: JobForm = {
  company_name: '',
  title: '',
  city: '',
  category: '',
  recruitment_type: '',
  degree: '',
  description: '',
  requirements: '',
  deadline: '',
  source_name: '',
  source_url: '',
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([])
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

  const cities = useMemo(() => [...new Set(jobs.map((j) => j.city))].sort(), [jobs])
  const categories = useMemo(() => [...new Set(jobs.map((j) => j.category))].sort(), [jobs])
  const recruitmentTypes = useMemo(() => [...new Set(jobs.map((j) => j.recruitment_type))].sort(), [jobs])
  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE))
  const pagedJobs = useMemo(() => jobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [jobs, currentPage])

  const toast = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2400)
  }

  const fetchStats = async () => {
    const res = await fetch(`${API}/api/stats`)
    const data = await res.json()
    setStats(data)
  }

  const fetchJobs = async () => {
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (city) params.set('city', city)
    if (category) params.set('category', category)
    if (recruitmentType) params.set('recruitment_type', recruitmentType)
    const res = await fetch(`${API}/api/jobs?${params.toString()}`)
    const data = await res.json()
    setJobs(data)
    setSelectedJob(data[0] || null)
    setCurrentPage(1)
  }

  const fetchFavorites = async (userId: number) => {
    const res = await fetch(`${API}/api/favorites?user_id=${userId}`)
    const data = await res.json()
    setFavorites(data)
    setFavoriteIds(new Set(data.map((job: Job) => job.id)))
  }

  const fetchApplications = async (userId: number) => {
    const res = await fetch(`${API}/api/applications?user_id=${userId}`)
    const data = await res.json()
    setApplications(data)
  }

  const fetchResume = async (userId: number) => {
    const res = await fetch(`${API}/api/users/${userId}/resume`)
    const data = await res.json()
    setResume({ ...emptyResume, ...data })
    setResumeAdvice(data.ai_advice || '')
  }

  const fetchAdminJobs = async () => {
    const res = await fetch(`${API}/api/jobs`)
    const data = await res.json()
    setAdminJobs(data.slice(0, 120))
  }

  useEffect(() => {
    fetchJobs()
    fetchStats()
  }, [])

  useEffect(() => {
    if (!user) return
    fetchFavorites(user.id)
    fetchApplications(user.id)
    fetchResume(user.id)
    if (user.role === 'admin') fetchAdminJobs()
  }, [user])

  const submitAuth = async () => {
    const url = authMode === 'login' ? `${API}/api/login` : `${API}/api/register`
    const payload = authMode === 'login'
      ? { username: authForm.username, password: authForm.password }
      : { username: authForm.username, password: authForm.password, email: authForm.email }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) return toast(data.detail || '操作失败')
    if (authMode === 'register') {
      toast('注册成功，请登录')
      setAuthMode('login')
      return
    }
    setUser(data)
    setView('home')
    toast(`欢迎回来，${data.username}`)
  }

  const toggleFavorite = async (jobId: number) => {
    if (!user) return toast('请先登录')
    const hasFavorite = favoriteIds.has(jobId)
    const url = hasFavorite ? `${API}/api/favorites/remove` : `${API}/api/favorites`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, job_id: jobId }),
    })
    if (!res.ok) return toast('操作失败')
    await fetchFavorites(user.id)
    toast(hasFavorite ? '已取消收藏' : '已加入收藏')
  }

  const updateApplication = async (jobId: number, status: string) => {
    if (!user) return toast('请先登录')
    const res = await fetch(`${API}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, job_id: jobId, status }),
    })
    if (!res.ok) return toast('保存进度失败')
    await fetchApplications(user.id)
    toast('投递进度已更新')
  }

  const saveResume = async () => {
    if (!user) return toast('请先登录')
    const res = await fetch(`${API}/api/users/${user.id}/resume`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resume),
    })
    if (!res.ok) return toast('保存失败')
    toast('简历信息已保存')
  }

  const optimizeResume = async () => {
    if (!user) return toast('请先登录')
    const res = await fetch(`${API}/api/users/${user.id}/resume/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, target_jd: targetJD }),
    })
    const data = await res.json()
    if (!res.ok) return toast('AI 优化失败')
    setResumeAdvice(data.advice)
    toast('AI 优化建议已生成')
  }

  const exportResumePdf = async () => {
    if (!user) return toast('请先登录')
    window.open(`${API}/api/resume/pdf/${user.id}`, '_blank')
  }

  const saveAdminJob = async () => {
    if (!user) return toast('请先登录')
    const url = editingId ? `${API}/api/admin/jobs/${editingId}?user_id=${user.id}` : `${API}/api/admin/jobs?user_id=${user.id}`
    const method = editingId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobForm),
    })
    if (!res.ok) return toast('保存岗位失败')
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
  }

  const deleteAdminJob = async (jobId: number) => {
    if (!user) return
    const res = await fetch(`${API}/api/admin/jobs/${jobId}?user_id=${user.id}`, { method: 'DELETE' })
    if (!res.ok) return toast('删除失败')
    toast('岗位已删除')
    fetchAdminJobs()
    fetchJobs()
    fetchStats()
  }

  const uploadCsv = async () => {
    if (!user || !csvFile) return toast('请选择 CSV 文件')
    const formData = new FormData()
    formData.append('file', csvFile)
    const res = await fetch(`${API}/api/admin/jobs/import?user_id=${user.id}`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) return toast('导入失败')
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

  const renderResumePreview = () => (
    <div className="resume-onepage-preview">
      <div className="resume-paper">
        <div className="resume-paper-head">
          <h2>{resume.full_name || '你的姓名'}</h2>
          <p>{resume.target_role || '目标岗位'} · {resume.city || '目标城市'}</p>
          <span>{resume.phone || '手机号'} · {resume.email || '邮箱'}</span>
        </div>
        <div className="resume-paper-section">
          <h4>教育背景</h4>
          <p>{resume.education || '填写教育经历、院校、专业、毕业时间等内容。'}</p>
        </div>
        <div className="resume-paper-section">
          <h4>技能栈</h4>
          <p>{resume.skills || '填写技能栈，例如 React / Python / SQL / 数据分析 / 算法等。'}</p>
        </div>
        <div className="resume-paper-section">
          <h4>项目经历</h4>
          <p>{resume.projects || '填写项目名称、职责、成果和亮点。'}</p>
        </div>
        <div className="resume-paper-section">
          <h4>实习 / 校园经历</h4>
          <p>{resume.experience || '填写实习、比赛、社团、科研等可展示经历。'}</p>
        </div>
        <div className="resume-paper-section">
          <h4>个人优势</h4>
          <p>{resume.strengths || '填写你的优势，例如学习快、执行力强、做过项目、有数据意识等。'}</p>
        </div>
      </div>
    </div>
  )

  const renderResumePage = () => (
    <div className="resume-page-stack">
      <div className="card premium-hero resume-hero-card ultra-hero-card">
        <div>
          <h2>个人简历</h2>
        </div>
        <div className="resume-hero-metrics">
          <div><strong>{resume.full_name ? '已填写' : '待填写'}</strong><span>简历状态</span></div>
          <div><strong>{resumeAdvice ? '已生成' : '待生成'}</strong><span>AI 优化建议</span></div>
          <div><strong>{targetJD ? '已输入' : '可选'}</strong><span>目标 JD</span></div>
          <div><strong>PDF</strong><span>支持导出</span></div>
        </div>
      </div>

      {!user && (
        <div className="card resume-locked">
          <h4>登录后可使用个人简历模块</h4>
          <p>请先点击右上角登录 / 注册，保存你的简历信息并生成 AI 优化建议。</p>
        </div>
      )}

      <div className="resume-grid resume-ultra-grid">
        <div className="card">
          <div className="section-head"><h3>个人简历信息</h3></div>
          <div className="resume-form-grid">
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
          <div className="resume-actions">
            <button className="primary" onClick={saveResume}>保存简历信息</button>
            <button onClick={optimizeResume}>AI 优化简历</button>
            <button onClick={exportResumePdf}>导出 PDF</button>
          </div>
        </div>

        <div className="resume-side-panel">
          <div className="card resume-preview-card">
            <div className="section-head"><h3>优化建议</h3></div>
            <pre>{resumeAdvice || '暂无内容'}</pre>
          </div>
          <div className="card resume-tips">
            <h4>简历提示</h4>
            <ul>
              <li>尽量用“做了什么 + 用了什么 + 产出什么结果”的方式写项目。</li>
              <li>把课程作业改造成更像“项目经历”的表达，会更适合校招简历。</li>
              <li>技能栈建议和目标岗位保持一致，避免过度堆砌。</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card onepage-preview-card">
        <div className="section-head"><h3>一页预览</h3></div>
        {renderResumePreview()}
      </div>
    </div>
  )

  const renderPagination = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 4) pages.push('...')
      for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) {
        pages.push(page)
      }
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

  const moduleCards = [
    {
      key: 'home',
      title: '岗位大厅',
      accent: `${stats?.total_jobs ?? '--'} 个岗位`,
      bullets: ['高密度筛选', '真实投递入口', '表格预览联动'],
    },
    {
      key: 'resume',
      title: '个人简历',
      accent: resume.full_name ? '已创建简历' : '开始制作简历',
      bullets: ['AI 优化建议', '一页预览', 'PDF 导出'],
    },
  ] as const

  return (
    <div className="app-shell upgraded-shell ultra-shell">
      <header className="topbar glass-card upgraded-topbar ultra-topbar compact-sticky-topbar linear-topbar deluxe-topbar">
        <div className="brand-block compact-brand-block brand-stack">
          <div className="brand-chip">CC</div>
          <div className="brand-copy">
            <span className="brand-overline">Career Command Center</span>
            <h1>ccofferhub</h1>
          </div>
        </div>
        <div className="header-right-tools">
          <nav className="topbar-nav-pill">
            <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>岗位大厅</button>
            <button className={view === 'resume' ? 'active' : ''} onClick={() => setView('resume')}>个人简历</button>
          </nav>
          {user ? (
            <div className="signed-user-box">
              <span>{user.username}</span>
              <button className="primary luxe-auth-btn" onClick={() => setUser(null)}>退出</button>
            </div>
          ) : (
            <div className="auth-mini-actions refined-auth-actions">
              <button className="luxe-auth-btn" onClick={() => { setAuthMode('login'); setView('auth') }}>登录</button>
              <button className="primary luxe-auth-btn" onClick={() => { setAuthMode('register'); setView('auth') }}>注册</button>
            </div>
          )}
        </div>
      </header>

      {message && <div className="banner">{message}</div>}

      <section className="home-control-deck">
        <div className="main-module-grid">
          {moduleCards.map((module) => (
            <button
              key={module.key}
              className={`module-card ${view === module.key ? 'active' : ''}`}
              onClick={() => setView(module.key)}
            >
              <div className="module-card-top">
                <span className="module-title-chip">{module.title}</span>
                <span className="module-accent">{module.accent}</span>
              </div>
              <div className="module-tags">
                {module.bullets.map((item) => <span key={item}>{item}</span>)}
              </div>
            </button>
          ))}
        </div>

        <div className="control-info-bar card minimal-info-bar">
          <div className="info-bar-metrics solo-info-metrics">
            <div><strong>{stats?.total_jobs ?? '--'}</strong><span>岗位总数</span></div>
            <div><strong>{stats?.total_companies ?? '--'}</strong><span>覆盖公司</span></div>
            <div><strong>{stats?.total_cities ?? '--'}</strong><span>覆盖城市</span></div>
            <div><strong>{stats?.today_new ?? '--'}</strong><span>今日新增</span></div>
          </div>
        </div>
      </section>

      <main className={`layout ${view === 'resume' || view === 'auth' || view === 'admin' || view === 'favorites' || view === 'applications' ? 'single-layout' : 'wide-layout'}`}>
        <section className="left-panel">
          {view === 'home' && (
            <>
              <div className="hero card premium-hero upgraded-hero ultra-home-hero condensed-hero minimalist-hero">
                <div>
                  <h2>岗位大厅</h2>
                </div>
                <div className="hero-side-note">
                  <div>
                    <strong>{jobs.length}</strong>
                    <span>当前筛选结果</span>
                  </div>
                  <div>
                    <strong>{selectedJob ? '已选中' : '待选择'}</strong>
                    <span>右侧联动预览</span>
                  </div>
                </div>
              </div>

              <div className="filters card filter-bar upgraded-filter-bar ultra-filter-bar compact-filter-bar">
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索公司 / 岗位 / 关键词" />
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">全部城市</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">全部类别</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={recruitmentType} onChange={(e) => setRecruitmentType(e.target.value)}>
                  <option value="">全部类型</option>
                  {recruitmentTypes.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className="primary" onClick={fetchJobs}>查询</button>
                <button onClick={clearFilters}>重置</button>
              </div>

              <div className="jobs card table-card upgraded-table-card ultra-table-card compact-jobs-card">
                <div className="section-head jobs-headline compact-jobs-headline">
                  <div>
                    <h3>岗位列表</h3>
                  </div>
                  <div className="jobs-headline-stat">共 {jobs.length} 条</div>
                </div>
                <div className="job-table-wrap compact-job-table-wrap">
                  <div className="job-table-head compact-job-table-head">
                    <span>岗位名称</span>
                    <span>公司</span>
                    <span>城市</span>
                    <span>类别</span>
                    <span>类型</span>
                    <span>学历</span>
                    <span>操作</span>
                  </div>
                  <div className="job-table-body">
                    {pagedJobs.map((job) => (
                      <div key={job.id} className={`job-table-row compact-job-row ${selectedJob?.id === job.id ? 'active' : ''}`} onClick={() => setSelectedJob(job)}>
                        <div className="job-primary compact-job-primary">
                          <strong>{job.title}</strong>
                          <small>{job.source_name}</small>
                        </div>
                        <span>{job.company_name}</span>
                        <span>{job.city}</span>
                        <span>{job.category}</span>
                        <span>{job.recruitment_type}</span>
                        <span>{job.degree}</span>
                        <div className="row-ops compact-row-ops">
                          <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); setSelectedJob(job) }}>预览</button>
                          <a className="link-btn" href={job.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>投递</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {renderPagination()}
                {!jobs.length && (
                  <div className="empty-state">
                    <h4>当前筛选暂无匹配岗位</h4>
                    <p>你可以点击“重置”恢复全部岗位列表，或者换一个城市 / 类别继续筛选。</p>
                    <button className="primary" onClick={clearFilters}>恢复全部岗位</button>
                  </div>
                )}
              </div>
            </>
          )}

          {view === 'resume' && renderResumePage()}

          {view === 'favorites' && (
            <div className="card">
              <div className="section-head"><h3>我的收藏</h3><span>{favorites.length} 条</span></div>
              <div className="simple-list">
                {favorites.map((job) => (
                  <div key={job.id} className="simple-item">
                    <div>
                      <strong>{job.title}</strong>
                      <p>{job.company_name} · {job.city}</p>
                    </div>
                    <a className="link-btn" href={job.source_url} target="_blank" rel="noreferrer">立即投递</a>
                  </div>
                ))}
                {!favorites.length && <p className="empty">还没有收藏岗位</p>}
              </div>
            </div>
          )}

          {view === 'applications' && (
            <div className="card">
              <div className="section-head"><h3>投递进度</h3><span>{applications.length} 条</span></div>
              <div className="simple-list">
                {applications.map((item) => (
                  <div key={item.id} className="simple-item column">
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.company_name} · {item.city}</p>
                    </div>
                    <div className="status-chip">{statusOptions.find((s) => s.value === item.status)?.label || item.status}</div>
                  </div>
                ))}
                {!applications.length && <p className="empty">还没有记录投递进度</p>}
              </div>
            </div>
          )}

          {view === 'admin' && (
            <>
              <div className="card">
                <div className="section-head"><h3>{editingId ? '编辑岗位' : '新增岗位'}</h3><span>{editingId ? `ID ${editingId}` : '手动录入'}</span></div>
                <div className="admin-form-grid">
                  <input placeholder="公司名称" value={jobForm.company_name} onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })} />
                  <input placeholder="岗位名称" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
                  <input placeholder="城市" value={jobForm.city} onChange={(e) => setJobForm({ ...jobForm, city: e.target.value })} />
                  <input placeholder="岗位类别" value={jobForm.category} onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })} />
                  <input placeholder="招聘类型" value={jobForm.recruitment_type} onChange={(e) => setJobForm({ ...jobForm, recruitment_type: e.target.value })} />
                  <input placeholder="学历要求" value={jobForm.degree} onChange={(e) => setJobForm({ ...jobForm, degree: e.target.value })} />
                  <input placeholder="截止时间" value={jobForm.deadline} onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })} />
                  <input placeholder="来源名称" value={jobForm.source_name} onChange={(e) => setJobForm({ ...jobForm, source_name: e.target.value })} />
                  <input className="full-span" placeholder="来源链接（留空会自动生成搜索投递入口）" value={jobForm.source_url} onChange={(e) => setJobForm({ ...jobForm, source_url: e.target.value })} />
                  <textarea className="full-span" placeholder="岗位描述" value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
                  <textarea className="full-span" placeholder="岗位要求" value={jobForm.requirements} onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })} />
                </div>
                <div className="admin-actions">
                  <button className="primary" onClick={saveAdminJob}>{editingId ? '保存修改' : '新增岗位'}</button>
                  <button onClick={() => { setEditingId(null); setJobForm(emptyJobForm) }}>清空</button>
                </div>
              </div>

              <div className="card">
                <div className="section-head"><h3>CSV 导入</h3><span>支持批量扩充岗位库</span></div>
                <div className="csv-box">
                  <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                  <button className="primary" onClick={uploadCsv}>上传导入</button>
                </div>
              </div>

              <div className="card">
                <div className="section-head"><h3>后台岗位管理</h3><span>{adminJobs.length} 条</span></div>
                <div className="admin-table">
                  {adminJobs.map((job) => (
                    <div className="admin-row" key={job.id}>
                      <div>
                        <strong>{job.title}</strong>
                        <p>{job.company_name} · {job.city} · {job.source_name}</p>
                      </div>
                      <div className="row-actions">
                        <span>{job.recruitment_type}</span>
                        <button onClick={() => editAdminJob(job)}>编辑</button>
                        <button onClick={() => deleteAdminJob(job.id)}>删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {view === 'auth' && !user && (
            <div className="card auth-page-card upgraded-auth-card">
              <div className="section-head">
                <h3>{authMode === 'login' ? '登录账号' : '注册账号'}</h3>
                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                  {authMode === 'login' ? '去注册' : '去登录'}
                </button>
              </div>
              <div className="auth-form auth-page-form">
                <input placeholder="用户名" value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })} />
                {authMode === 'register' && <input placeholder="邮箱" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />}
                <input type="password" placeholder="密码" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
                <button className="primary" onClick={submitAuth}>{authMode === 'login' ? '登录' : '注册'}</button>
                <div className="demo-box">
                  <p><strong>演示账号</strong></p>
                  <p>普通用户：demo / demo123456</p>
                  <p>管理员：admin / admin123456</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {view === 'home' && (
          <aside className="right-panel sticky-detail">
            <div className="card detail-card detail-upgraded ultra-detail-card product-preview-card">
              <div className="section-head">
                <h3>岗位预览</h3>
                {selectedJob && <button onClick={() => toggleFavorite(selectedJob.id)}>{favoriteIds.has(selectedJob.id) ? '取消收藏' : '加入收藏'}</button>}
              </div>
              {selectedJob ? (
                <div className="detail-content">
                  <h2>{selectedJob.title}</h2>
                  <p className="subtitle">{selectedJob.company_name} · {selectedJob.city} · {selectedJob.recruitment_type}</p>
                  <div className="chips">
                    <span>{selectedJob.category}</span>
                    <span>{selectedJob.degree}</span>
                    <span>截止 {selectedJob.deadline}</span>
                  </div>
                  <div className="info-panel">
                    <h4>岗位描述</h4>
                    <p>{selectedJob.description}</p>
                  </div>
                  <div className="info-panel">
                    <h4>岗位要求</h4>
                    <p>{selectedJob.requirements}</p>
                  </div>
                  <div className="detail-action-group">
                    <a className="primary link-btn" href={selectedJob.source_url} target="_blank" rel="noreferrer">前往真实投递入口</a>
                  </div>
                  <div>
                    <h4>投递状态</h4>
                    <div className="status-grid">
                      {statusOptions.map((status) => (
                        <button key={status.value} onClick={() => updateApplication(selectedJob.id, status.value)}>{status.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state compact-empty">
                  <h4>请选择一个岗位</h4>
                  <p>左侧表格会展示大量岗位信息，点击某一行即可在这里预览。</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  )
}

export default App
