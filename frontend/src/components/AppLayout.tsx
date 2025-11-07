'use client';

import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import ChatLayout from './ChatLayout';
import FriendsLayout from './FriendsLayout';
import SocialLayout from './SocialLayout';

export default function AppLayout() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active page from URL
  const getActivePage = (): 'chat' | 'friends' | 'social' => {
    if (pathname?.includes('/friends')) return 'friends';
    if (pathname?.includes('/social')) return 'social';
    return 'chat';
  };

  const activePage = getActivePage();

  const handlePageChange = (page: 'chat' | 'friends' | 'social') => {
    if (page === 'chat') {
      router.push('/chat');
    } else if (page === 'friends') {
      router.push('/friends');
    } else if (page === 'social') {
      router.push('/social');
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar activePage={activePage} onPageChange={handlePageChange} />
      {activePage === 'chat' ? (
        <ChatLayout />
      ) : activePage === 'friends' ? (
        <FriendsLayout />
      ) : (
        <SocialLayout />
      )}
    </div>
  );
}

