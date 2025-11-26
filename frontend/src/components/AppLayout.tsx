'use client';

import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import ChatLayout from './ChatLayout';
import FriendsLayout from './FriendsLayout';
import SocialLayout from './SocialLayout';
import ProfilePanel from './ProfilePanel';

export default function AppLayout() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active page from URL
  const getActivePage = (): 'chat' | 'friends' | 'social' | 'profile' => {
    if (pathname?.includes('/friends')) return 'friends';
    if (pathname?.includes('/social')) return 'social';
    if (pathname?.includes('/profile')) return 'profile';
    return 'chat';
  };

  const activePage = getActivePage();

  const handlePageChange = (page: 'chat' | 'friends' | 'social' | 'profile') => {
    if (page === 'chat') {
      router.push('/chat');
    } else if (page === 'friends') {
      router.push('/friends');
    } else if (page === 'social') {
      router.push('/social');
    } else if (page === 'profile') {
      router.push('/profile');
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case 'chat':
        return <ChatLayout />;
      case 'friends':
        return <FriendsLayout />;
      case 'social':
        return <SocialLayout />;
      case 'profile':
        return <ProfilePanel />;
      default:
        return <ChatLayout />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar activePage={activePage} onPageChange={handlePageChange} />
      {renderContent()}
    </div>
  );
}
