import { useNavigate } from 'react-router-dom';

export function useSiteBack() {
  const navigate = useNavigate();
  return () => {
    // BrowserRouter numbers entries it creates and starts direct visits at zero.
    if (window.history.state?.idx > 0) void navigate(-1);
    else void navigate('/', { replace: true });
  };
}
