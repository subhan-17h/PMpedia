import { useState } from 'react';
import Nav from './components/Nav';
import SearchPage from './pages/SearchPage';
import ChatPage from './pages/ChatPage';

export default function App() {
  const [page, setPage] = useState('search');

  return (
    <>
      <Nav page={page} onNavigate={setPage} />
      {page === 'search' ? <SearchPage /> : <ChatPage />}
    </>
  );
}
