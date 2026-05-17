import csv
from datetime import datetime
from io import BytesIO, StringIO
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATABASE_URL = "sqlite:///./ccofferhub.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String(120), index=True)
    title: Mapped[str] = mapped_column(String(120), index=True)
    city: Mapped[str] = mapped_column(String(50), index=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    recruitment_type: Mapped[str] = mapped_column(String(50), index=True)
    degree: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    requirements: Mapped[str] = mapped_column(Text)
    deadline: Mapped[str] = mapped_column(String(50))
    source_name: Mapped[str] = mapped_column(String(80))
    source_url: Mapped[str] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Favorite(Base):
    __tablename__ = "favorites"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"))


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"))
    status: Mapped[str] = mapped_column(String(30), default="not_applied")
    notes: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ResumeProfile(Base):
    __tablename__ = "resume_profiles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(80), default="")
    target_role: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(50), default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    city: Mapped[str] = mapped_column(String(80), default="")
    education: Mapped[str] = mapped_column(Text, default="")
    skills: Mapped[str] = mapped_column(Text, default="")
    experience: Mapped[str] = mapped_column(Text, default="")
    projects: Mapped[str] = mapped_column(Text, default="")
    advantages: Mapped[str] = mapped_column(Text, default="")
    optimized_summary: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    username: str
    password: str


class FavoriteIn(BaseModel):
    user_id: int
    job_id: int


class ApplicationIn(BaseModel):
    user_id: int
    job_id: int
    status: str
    notes: Optional[str] = ""


class JobCreateIn(BaseModel):
    company_name: str
    title: str
    city: str
    category: str
    recruitment_type: str
    degree: str
    description: str
    requirements: str
    deadline: str
    source_name: str
    source_url: str
    is_active: bool = True


class JobOut(BaseModel):
    id: int
    company_name: str
    title: str
    city: str
    category: str
    recruitment_type: str
    degree: str
    description: str
    requirements: str
    deadline: str
    source_name: str
    source_url: str
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class ResumeProfileIn(BaseModel):
    user_id: int
    full_name: str = ''
    target_role: str = ''
    phone: str = ''
    email: str = ''
    city: str = ''
    education: str = ''
    skills: str = ''
    experience: str = ''
    projects: str = ''
    advantages: str = ''


class ResumeOptimizeIn(ResumeProfileIn):
    jd_text: str = ''


app = FastAPI(title="ccofferhub API")
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
FONT_PATHS = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_admin(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


def create_job_from_payload(payload: JobCreateIn) -> Job:
    return Job(
        company_name=payload.company_name,
        title=payload.title,
        city=payload.city,
        category=payload.category,
        recruitment_type=payload.recruitment_type,
        degree=payload.degree,
        description=payload.description,
        requirements=payload.requirements,
        deadline=payload.deadline,
        source_name=payload.source_name,
        source_url=payload.source_url,
        is_active=payload.is_active,
        updated_at=datetime.utcnow(),
    )


def build_real_source_url(company_name: str, title: str, source_url: str) -> str:
    url = (source_url or '').strip()
    if url and 'example.com' not in url:
        return url
    search_keyword = f"{company_name} {title} 校招"
    return f"https://www.google.com/search?q={search_keyword.replace(' ', '+')}"


def generate_resume_optimization(payload: ResumeOptimizeIn) -> str:
    skills = [item.strip() for item in payload.skills.replace('，', ',').split(',') if item.strip()]
    skill_summary = '、'.join(skills[:8]) if skills else '相关岗位核心技能'
    project_hint = payload.projects.strip() or '你参与过的项目经历'
    experience_hint = payload.experience.strip() or '你过往的实习/校园经历'
    strengths = payload.advantages.strip() or '学习能力强、执行力强、沟通协作顺畅'
    jd_focus = payload.jd_text.strip() or '目标岗位要求中的核心关键词'
    return (
        f"【AI优化后的简历表达建议】\n"
        f"1. 求职定位\n建议将求职意向明确写为：{payload.target_role or '目标岗位待补充'}，并在简历开头突出与岗位最相关的关键词：{skill_summary}。如果你正在投递某个具体岗位，建议同步贴合 JD 中的关键词：{jd_focus}。\n\n"
        f"2. 个人优势亮点\n建议将个人优势改写为：具备{strengths}，能够围绕{payload.target_role or '目标岗位'}快速理解业务需求，并将{skill_summary}应用到实际项目中。\n\n"
        f"3. 项目经历优化\n建议将项目经历按“背景-动作-结果”展开，重点突出你在{project_hint}中解决了什么问题、使用了什么技术、产出了什么结果，避免只写功能堆砌。\n\n"
        f"4. 实习/经历优化\n建议将经历中的内容聚焦到岗位相关能力，围绕{experience_hint}补充可量化成果，例如提升效率、完成上线、支撑多少用户或多少数据量。\n\n"
        f"5. JD 匹配建议\n把 JD 中出现频率最高的 3~5 个关键词单独写进技能、项目描述和自我评价里，让简历更像“为岗位定制”。\n\n"
        f"6. 简历整体建议\n控制在一页内，信息顺序建议为：基本信息 → 求职意向 → 教育背景 → 技能栈 → 项目经历 → 实习经历/校园经历。每段经历尽量用动词开头，并增加结果导向表述。"
    )


def register_cjk_font() -> str:
    font_name = 'Helvetica'
    for path in FONT_PATHS:
        if Path(path).exists():
            try:
                pdfmetrics.registerFont(TTFont('ResumeCJK', path))
                return 'ResumeCJK'
            except Exception:
                continue
    return font_name


def build_resume_pdf_bytes(profile: ResumeProfile) -> bytes:
    buffer = BytesIO()
    font_name = register_cjk_font()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=16 * mm, bottomMargin=14 * mm, leftMargin=14 * mm, rightMargin=14 * mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TitleCN', parent=styles['Title'], fontName=font_name, fontSize=18, leading=22, textColor=colors.HexColor('#0f172a'))
    heading_style = ParagraphStyle('HeadingCN', parent=styles['Heading2'], fontName=font_name, fontSize=11, leading=16, textColor=colors.HexColor('#1d4ed8'))
    body_style = ParagraphStyle('BodyCN', parent=styles['BodyText'], fontName=font_name, fontSize=9.6, leading=14, textColor=colors.HexColor('#334155'))
    small_style = ParagraphStyle('SmallCN', parent=styles['BodyText'], fontName=font_name, fontSize=8.8, leading=12, textColor=colors.HexColor('#475569'))

    story = []
    story.append(Paragraph(profile.full_name or '未填写姓名', title_style))
    meta = ' | '.join([item for item in [profile.target_role, profile.city, profile.phone, profile.email] if item]) or '请先填写目标岗位 / 联系方式 / 城市'
    story.append(Paragraph(meta, small_style))
    story.append(Spacer(1, 6 * mm))

    summary_table = Table([
        ['求职方向', profile.target_role or '待补充', '教育背景', profile.education or '待补充'],
        ['核心技能', profile.skills or '待补充', '个人优势', profile.advantages or '待补充'],
    ], colWidths=[24 * mm, 67 * mm, 24 * mm, 67 * mm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
        ('FONTNAME', (0, 0), (-1, -1), font_name),
        ('FONTSIZE', (0, 0), (-1, -1), 8.8),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 4 * mm))

    sections = [
        ('项目经历', profile.projects),
        ('实习 / 校园经历', profile.experience),
        ('AI 优化建议', profile.optimized_summary or '可在网页中点击“AI 优化简历”生成优化内容'),
    ]
    for title, content in sections:
        story.append(Paragraph(title, heading_style))
        story.append(Paragraph((content or '待补充').replace('\n', '<br/>'), body_style))
        story.append(Spacer(1, 3.2 * mm))

    doc.build(story)
    return buffer.getvalue()


def seed_data(db: Session):
    if db.query(Job).count() > 0:
        return
    jobs = [
        Job(company_name="腾讯", title="前端开发工程师", city="深圳", category="前端", recruitment_type="校招", degree="本科及以上", description="负责企业级前端产品开发与体验优化。", requirements="熟悉 React / TypeScript / 工程化。", deadline="2026-10-15", source_name="企业官网", source_url="https://careers.tencent.com"),
        Job(company_name="字节跳动", title="后端开发工程师", city="北京", category="后端", recruitment_type="校招", degree="本科及以上", description="参与高并发业务系统开发。", requirements="熟悉 Python / Go / 数据库。", deadline="2026-09-30", source_name="企业官网", source_url="https://jobs.bytedance.com"),
        Job(company_name="美团", title="数据分析实习生", city="上海", category="数据", recruitment_type="实习", degree="本科及以上", description="支持业务分析与数据看板搭建。", requirements="熟悉 SQL / Excel / Python 优先。", deadline="2026-08-20", source_name="公开招聘页", source_url="https://zhaopin.meituan.com"),
        Job(company_name="阿里云", title="测试开发工程师", city="杭州", category="测试", recruitment_type="秋招", degree="本科及以上", description="参与质量保障体系与自动化测试建设。", requirements="了解自动化测试与接口测试。", deadline="2026-10-05", source_name="企业官网", source_url="https://talent.alibaba.com"),
        Job(company_name="小红书", title="产品经理实习生", city="上海", category="产品", recruitment_type="实习", degree="本科及以上", description="协助产品需求分析与竞品调研。", requirements="具备良好沟通表达与逻辑能力。", deadline="2026-08-31", source_name="公开招聘页", source_url="https://job.xiaohongshu.com"),
        Job(company_name="招商银行", title="金融科技岗", city="深圳", category="金融科技", recruitment_type="秋招", degree="本科及以上", description="参与银行数字化产品与系统建设。", requirements="计算机相关专业优先。", deadline="2026-09-25", source_name="招聘公告", source_url="https://career.cmbchina.com"),
    ]
    db.add_all(jobs)
    db.add(User(username="demo", email="demo@ccofferhub.com", password="demo123456", role="user"))
    db.add(User(username="admin", email="admin@ccofferhub.com", password="admin123456", role="admin"))
    db.commit()


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_data(db)
    if FRONTEND_DIST.exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.is_active == True).all()
    companies = len({j.company_name for j in jobs})
    cities = len({j.city for j in jobs})
    return {
        "total_jobs": len(jobs),
        "total_companies": companies,
        "total_cities": cities,
        "today_new": min(8, len(jobs)),
    }


@app.get("/api/jobs", response_model=list[JobOut])
def list_jobs(
    keyword: Optional[str] = None,
    city: Optional[str] = None,
    recruitment_type: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Job).filter(Job.is_active == True)
    if keyword:
        query = query.filter((Job.company_name.contains(keyword)) | (Job.title.contains(keyword)))
    if city:
        query = query.filter(Job.city == city)
    if recruitment_type:
        query = query.filter(Job.recruitment_type == recruitment_type)
    if category:
        query = query.filter(Job.category == category)
    jobs = query.order_by(Job.updated_at.desc()).all()
    for job in jobs:
        job.source_url = build_real_source_url(job.company_name, job.title, job.source_url)
    return jobs


@app.get("/api/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.source_url = build_real_source_url(job.company_name, job.title, job.source_url)
    return job


@app.post("/api/auth/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = User(username=payload.username, email=payload.email, password=payload.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "注册成功", "user_id": user.id}


@app.post("/api/auth/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username, User.password == payload.password).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return {"message": "登录成功", "user": {"id": user.id, "username": user.username, "role": user.role}}


@app.get("/api/users/{user_id}/favorites")
def list_favorites(user_id: int, db: Session = Depends(get_db)):
    favorites = db.query(Favorite).filter(Favorite.user_id == user_id).all()
    job_ids = [fav.job_id for fav in favorites]
    if not job_ids:
        return []
    jobs = db.query(Job).filter(Job.id.in_(job_ids)).all()
    for job in jobs:
        job.source_url = build_real_source_url(job.company_name, job.title, job.source_url)
    return jobs


@app.post("/api/favorites")
def add_favorite(payload: FavoriteIn, db: Session = Depends(get_db)):
    exists = db.query(Favorite).filter(Favorite.user_id == payload.user_id, Favorite.job_id == payload.job_id).first()
    if not exists:
        db.add(Favorite(user_id=payload.user_id, job_id=payload.job_id))
        db.commit()
    return {"message": "收藏成功"}


@app.delete("/api/favorites")
def remove_favorite(user_id: int, job_id: int, db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(Favorite.user_id == user_id, Favorite.job_id == job_id).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"message": "已取消收藏"}


@app.get("/api/users/{user_id}/applications")
def list_applications(user_id: int, db: Session = Depends(get_db)):
    apps = db.query(Application).filter(Application.user_id == user_id).all()
    data = []
    for app_item in apps:
        job = db.query(Job).filter(Job.id == app_item.job_id).first()
        if job:
            data.append({
                "id": app_item.id,
                "job_id": job.id,
                "company_name": job.company_name,
                "title": job.title,
                "city": job.city,
                "status": app_item.status,
                "notes": app_item.notes,
                "updated_at": app_item.updated_at,
            })
    return data


@app.post("/api/applications")
def save_application(payload: ApplicationIn, db: Session = Depends(get_db)):
    app_row = db.query(Application).filter(Application.user_id == payload.user_id, Application.job_id == payload.job_id).first()
    if app_row:
        app_row.status = payload.status
        app_row.notes = payload.notes or ""
        app_row.updated_at = datetime.utcnow()
    else:
        app_row = Application(user_id=payload.user_id, job_id=payload.job_id, status=payload.status, notes=payload.notes or "")
        db.add(app_row)
    db.commit()
    return {"message": "投递进度已更新"}


@app.get("/api/users/{user_id}/resume")
def get_resume_profile(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(ResumeProfile).filter(ResumeProfile.user_id == user_id).first()
    if not profile:
        return {
            "user_id": user_id,
            "full_name": "",
            "target_role": "",
            "phone": "",
            "email": "",
            "city": "",
            "education": "",
            "skills": "",
            "experience": "",
            "projects": "",
            "advantages": "",
            "optimized_summary": "",
        }
    return {
        "user_id": profile.user_id,
        "full_name": profile.full_name,
        "target_role": profile.target_role,
        "phone": profile.phone,
        "email": profile.email,
        "city": profile.city,
        "education": profile.education,
        "skills": profile.skills,
        "experience": profile.experience,
        "projects": profile.projects,
        "advantages": profile.advantages,
        "optimized_summary": profile.optimized_summary,
    }


@app.post("/api/resume/save")
def save_resume_profile(payload: ResumeProfileIn, db: Session = Depends(get_db)):
    profile = db.query(ResumeProfile).filter(ResumeProfile.user_id == payload.user_id).first()
    if not profile:
        profile = ResumeProfile(user_id=payload.user_id)
        db.add(profile)
    for key, value in payload.model_dump().items():
        if key != 'user_id':
            setattr(profile, key, value)
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return {"message": "简历信息已保存"}


@app.post("/api/resume/optimize")
def optimize_resume(payload: ResumeOptimizeIn, db: Session = Depends(get_db)):
    profile = db.query(ResumeProfile).filter(ResumeProfile.user_id == payload.user_id).first()
    if not profile:
        profile = ResumeProfile(user_id=payload.user_id)
        db.add(profile)
    for key, value in payload.model_dump().items():
        if key not in {'user_id', 'jd_text'}:
            setattr(profile, key, value)
    optimized = generate_resume_optimization(payload)
    profile.optimized_summary = optimized
    profile.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "AI简历优化完成", "optimized_summary": optimized}


@app.get("/api/resume/pdf/{user_id}")
def export_resume_pdf(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(ResumeProfile).filter(ResumeProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="请先填写简历信息")
    pdf_bytes = build_resume_pdf_bytes(profile)
    safe_name = (profile.full_name or 'resume').replace(' ', '_')
    return StreamingResponse(BytesIO(pdf_bytes), media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="{safe_name}_resume.pdf"'})


@app.get("/api/admin/jobs")
def admin_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.updated_at.desc()).all()
    for job in jobs:
        job.source_url = build_real_source_url(job.company_name, job.title, job.source_url)
    return jobs


@app.post("/api/admin/jobs")
def admin_create_job(user_id: int, payload: JobCreateIn, db: Session = Depends(get_db)):
    is_admin(user_id, db)
    payload.source_url = build_real_source_url(payload.company_name, payload.title, payload.source_url)
    job = create_job_from_payload(payload)
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"message": "岗位已新增", "job": job}


@app.put("/api/admin/jobs/{job_id}")
def admin_update_job(job_id: int, user_id: int, payload: JobCreateIn, db: Session = Depends(get_db)):
    is_admin(user_id, db)
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    normalized = payload.model_dump()
    normalized['source_url'] = build_real_source_url(payload.company_name, payload.title, payload.source_url)
    for key, value in normalized.items():
        setattr(job, key, value)
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return {"message": "岗位已更新", "job": job}


@app.delete("/api/admin/jobs/{job_id}")
def admin_delete_job(job_id: int, user_id: int, db: Session = Depends(get_db)):
    is_admin(user_id, db)
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    db.delete(job)
    db.commit()
    return {"message": "岗位已删除"}


@app.post("/api/admin/jobs/import")
async def admin_import_jobs(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    is_admin(user_id, db)
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(StringIO(text))
    created = 0
    for row in reader:
        if not row.get("company_name") or not row.get("title"):
            continue
        payload = JobCreateIn(
            company_name=row.get("company_name", ""),
            title=row.get("title", ""),
            city=row.get("city", ""),
            category=row.get("category", "其他"),
            recruitment_type=row.get("recruitment_type", "校招"),
            degree=row.get("degree", "本科及以上"),
            description=row.get("description", ""),
            requirements=row.get("requirements", ""),
            deadline=row.get("deadline", "招满为止"),
            source_name=row.get("source_name", "CSV导入"),
            source_url=build_real_source_url(row.get("company_name", ""), row.get("title", ""), row.get("source_url", "")),
            is_active=str(row.get("is_active", "true")).lower() != "false",
        )
        db.add(create_job_from_payload(payload))
        created += 1
    db.commit()
    return {"message": "导入完成", "created": created}


@app.get("/api/resume/pdf/{user_id}")
def export_resume_pdf(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(ResumeProfile).filter(ResumeProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="请先填写简历信息")
    pdf_bytes = build_resume_pdf_bytes(profile)
    safe_name = (profile.full_name or 'resume').replace(' ', '_')
    return StreamingResponse(BytesIO(pdf_bytes), media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="{safe_name}_resume.pdf"'})


@app.get("/", include_in_schema=False)
def serve_frontend():
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "frontend not built"}


@app.get("/{full_path:path}", include_in_schema=False)
def frontend_spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    target = FRONTEND_DIST / full_path
    if target.exists() and target.is_file():
        return FileResponse(target)
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Frontend not built")
