import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom'
import { CompareTray } from './components/CompareTray'
import { Layout, useTitle } from './components/Layout'
import { Empty } from './components/ui'
import { CatalogProvider } from './lib/catalog'
import { StoreProvider } from './lib/store'
import Home from './pages/Home'
import WorkerIntro from './pages/worker/WorkerIntro'
import WorkerFlow from './pages/worker/WorkerFlow'
import WorkerResult from './pages/worker/WorkerResult'
import WorkerWhatIf from './pages/worker/WorkerWhatIf'
import WorkerPlan from './pages/worker/WorkerPlan'
import ExplorerIntro from './pages/explorer/ExplorerIntro'
import { ExplorerMore, InterestQuestion } from './pages/explorer/ExplorerFlow'
import ExplorerResult from './pages/explorer/ExplorerResult'
import Occupations from './pages/explorer/Occupations'
import OccupationDetail from './pages/explorer/OccupationDetail'
import Compare from './pages/explorer/Compare'
import ActivityPage from './pages/explorer/ActivityPage'
import ExplorerPlan from './pages/explorer/ExplorerPlan'
import Practice from './pages/common/Practice'
import Me from './pages/common/Me'
import History from './pages/common/History'
import Report from './pages/common/Report'
import Shared from './pages/common/Shared'
import Quick from './pages/worker/Quick'

function NotFound() {
  useTitle('페이지를 찾을 수 없어요')
  return (
    <div className="wrap page narrow">
      <Empty title="페이지를 찾을 수 없어요" action={<Link to="/" className="btn primary">홈으로</Link>} />
    </div>
  )
}

function Shell() {
  return (
    <>
      <Layout />
      <CompareTray />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/quick/:occ', element: <Quick /> },
      { path: '/s/:token', element: <Shared /> },
      { path: '/worker', element: <WorkerIntro /> },
      { path: '/worker/start/:step', element: <WorkerFlow /> },
      { path: '/worker/result', element: <WorkerResult /> },
      { path: '/worker/whatif', element: <WorkerWhatIf /> },
      { path: '/worker/plan', element: <WorkerPlan /> },
      { path: '/explore', element: <ExplorerIntro /> },
      { path: '/explore/interests/:n', element: <InterestQuestion /> },
      { path: '/explore/more', element: <ExplorerMore /> },
      { path: '/explore/result', element: <ExplorerResult /> },
      { path: '/explore/plan', element: <ExplorerPlan /> },
      { path: '/occupations', element: <Occupations /> },
      { path: '/occupations/:id', element: <OccupationDetail /> },
      { path: '/compare', element: <Compare /> },
      { path: '/activities/:id', element: <ActivityPage /> },
      { path: '/practice', element: <Practice /> },
      { path: '/me', element: <Me /> },
      { path: '/me/history', element: <History /> },
      { path: '/report/:mode', element: <Report /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return (
    <StoreProvider>
      <CatalogProvider>
        <RouterProvider router={router} />
      </CatalogProvider>
    </StoreProvider>
  )
}
