# CCOfferHub

一个适合校招 / 实习求职展示的全栈 Web 项目：**岗位大厅 + 收藏投递追踪 + 在线简历生成**。

项目目标是做出一个**适合放在简历作品集里、能在线演示、界面较强视觉化**的求职平台 Demo。

## 项目亮点

- **岗位大厅**：浏览岗位、筛选岗位、查看详情
- **收藏与投递追踪**：标记收藏、记录投递状态
- **在线简历模块**：填写简历信息并导出 PDF
- **后台岗位管理**：支持管理员录入 / 导入岗位数据
- **前后端一体部署**：FastAPI 提供 API，同时托管前端静态资源
- **适合演示**：默认内置示例数据，开箱即可本地运行

## 技术栈

### 前端
- React 19
- TypeScript
- Vite
- 原生 CSS（定制化暗色高质感 UI）

### 后端
- FastAPI
- SQLAlchemy
- SQLite
- ReportLab（PDF 简历导出）

## 项目结构

```bash
ccofferhub/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── README.md
├── LICENSE
└── .gitignore
```

## 本地运行

### 1）启动后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install reportlab
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2）启动前端开发环境

新开一个终端：

```bash
cd frontend
npm install
npm run dev
```

默认前端开发地址：
- http://localhost:4173

默认后端地址：
- http://localhost:8000

## 生产构建

### 构建前端

```bash
cd frontend
npm install
npm run build
```

构建后，后端会读取 `frontend/dist/` 作为静态资源目录。

### 启动生产服务

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

然后直接访问：
- http://localhost:8000

## 默认演示账号

项目内置了演示账号，方便体验：

- 普通用户：`demo / demo123456`
- 管理员：`admin / admin123456`

> 注意：这两个账号仅用于 Demo 演示，不适合生产环境。

## 数据说明

仓库默认**不提交本地数据库和大体积 CSV 数据文件**，避免仓库臃肿。

应用首次启动时会自动创建 SQLite 数据库，并写入一批示例岗位与演示账号。

## 已知限制

当前项目定位为作品集 Demo，仍有一些地方适合后续继续增强：

- 登录密码目前为明文演示逻辑，未接入真正的鉴权体系
- SQLite 适合单机演示，不适合高并发生产环境
- 管理端权限校验仍可继续加强
- 缺少自动化测试与 CI/CD 流程

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

## 适合谁

如果你是：
- 正在准备校招 / 实习 / 社招作品集
- 想做一个“能演示、好看、完整”的全栈项目
- 想把“岗位聚合 + 简历生成”包装成作品展示

这个项目很适合继续二次开发。
