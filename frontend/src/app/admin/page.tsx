'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import AdminLayout from '@/components/AdminLayout';

export default function AdminPage() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAppSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Kiểm tra authentication và role
    if (!token || !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Kiểm tra role admin
    if (user?.role !== 'admin') {
      alert('Bạn không có quyền truy cập trang này. Chỉ admin mới được phép.');
      router.push('/social');
      return;
    }

    setIsChecking(false);
  }, [user, token, isAuthenticated, router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  return <AdminLayout />;
}
