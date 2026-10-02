import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

class AppErrorBoundary extends React.Component {
  constructor(props){
    super(props)
    this.state={error:null}
  }
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(error,info){console.error('[IJ Maintenance] UI error',error,info)}
  render(){
    if(this.state.error){
      return <div className="app-error-screen">
        <section className="app-error-card">
          <div className="app-error-mark">!</div>
          <p className="eyebrow">IJ MAINTENANCE SYSTEM</p>
          <h1>Page could not be displayed</h1>
          <h2>ไม่สามารถแสดงหน้านี้ได้</h2>
          <p>The system caught an unexpected page error. Your maintenance data has not been deleted.</p>
          <small>ระบบตรวจพบข้อผิดพลาดของหน้าจอ ข้อมูลซ่อมบำรุงในฐานข้อมูลไม่ได้ถูกลบ</small>
          <button onClick={()=>window.location.reload()}>Reload system <span>โหลดระบบใหม่</span></button>
          <details><summary>Technical detail / รายละเอียดทางเทคนิค</summary><pre>{String(this.state.error?.message||this.state.error)}</pre></details>
        </section>
      </div>
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>
)
