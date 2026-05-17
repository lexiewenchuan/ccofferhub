# CCOfferHub

一个面向校招与实习场景的招聘信息聚合平台，包含岗位浏览、收藏投递、简历编辑和后台录入功能。

## 预览

- 在线演示：待补充
- 仓库地址：https://github.com/lexiewenchuan/ccofferhub

## 项目截图

> 建议补 3~5 张截图放在 `docs/` 目录，然后把图片链接挂到这里。
>
> 例如：
> 
> `![首页](./docs/home.png)`
> 
> `![岗位大厅](./docs/jobs.png)`
> 
> `![简历模块](./docs/resume.png)`

## 功能

- 岗位大厅：分页浏览、筛选、查看岗位详情
- 收藏与投递记录：管理感兴趣的岗位，跟踪投递进度
- 在线简历：填写个人信息，生成 PDF 简历
- 管理后台：支持岗位新增、编辑、CSV 导入
- 前后端一体部署：后端提供 API，同时托管前端静态资源

## 技术栈

### Frontend
- React 19
- TypeScript
- Vite
- CSS

### Backend
- FastAPI
- SQLAlchemy
- SQLite
- ReportLab

## 项目结构

```bash
ccofferhub/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
├── LICENSE
└── README.md
```

## 部署

### Render

这个项目可以直接部署到 Render。

1. 登录 Render
2. 选择 **New +** → **Blueprint** 或 **Web Service**
3. 连接 GitHub 仓库：`lexiewenchuan/ccofferhub`
4. 如果使用 Blueprint，Render 会自动读取根目录的 `render.yaml`
5. 等待构建完成

部署后，Render 会分配一个固定地址，例如：

- `https://ccofferhub.onrender.com`
- 或者 `https://你的服务名.onrender.com`

当前部署使用：

- Build Command
  ```bash
  cd frontend && npm ci && npm run build && cd ../backend && pip install -r requirements.txt
  ```

- Start Command
  ```bash
  cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

### 本地运行

### 1. 启动后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install reportlab
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认地址：

- 前端：http://localhost:4173
- 后端：http://localhost:8000

## 生产构建

### 构建前端

```bash
cd frontend
npm install
npm run build
```

### 启动服务

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

访问：

- http://localhost:8000

## 演示账号

- 用户：`demo / demo123456`
- 管理员：`admin / admin123456`

## 数据说明

仓库默认不提交本地数据库、虚拟环境和大体积 CSV 文件。

应用首次启动时会自动创建 SQLite 数据库，并写入示例数据。

## 后续可优化方向

- 登录鉴权与密码加密
- 更细的权限控制
- 自动化测试
- CI/CD
- 多数据源岗位采集

## License

MIT
