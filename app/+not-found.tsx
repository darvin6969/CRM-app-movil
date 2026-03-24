import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function NotFound() {
    const router = useRouter();
    
    useEffect(() => {
        // If we hit a 404 (common during OAuth redirects), go back home
        router.replace('/');
    }, []);

    return null;
}
