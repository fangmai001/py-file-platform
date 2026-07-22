function AdminPage() {
  return (
    <div className="page">
      <h1>管理後台</h1>
      <p className="muted">使用者與檔案管理（placeholder，之後接管理員 API）。</p>

      <section className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">—</span>
          <span className="stat-label">使用者總數</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">—</span>
          <span className="stat-label">檔案總數</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">—</span>
          <span className="stat-label">待審核操作</span>
        </div>
      </section>

      <section className="card">
        <h2>近期操作紀錄</h2>
        <div className="empty-state">
          <p>尚未串接管理員 API</p>
          <p className="muted">之後這裡會顯示使用者、檔案管理與稽核紀錄。</p>
        </div>
      </section>
    </div>
  );
}

export default AdminPage;
