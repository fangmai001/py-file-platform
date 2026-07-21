function LoginPage() {
  return (
    <div className="page page-center">
      <div className="card auth-card">
        <h1 className="auth-title">登入</h1>
        <p className="muted">尚未串接本地帳號認證 API，以下表單僅為畫面預覽。</p>

        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="username">帳號</label>
            <input id="username" type="text" placeholder="請輸入帳號" disabled />
          </div>
          <div className="field">
            <label htmlFor="password">密碼</label>
            <input id="password" type="password" placeholder="請輸入密碼" disabled />
          </div>
          <button type="submit" className="btn btn-primary" disabled>
            登入
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
