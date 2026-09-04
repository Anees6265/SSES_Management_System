export const handleApiError = (error, navigate) => {
  if (error.response) {
    const status = error.response.status;
    
    switch (status) {
      case 404:
        navigate('/404');
        break;
      case 405:
      case 500:
      case 502:
      case 503:
        navigate('/server-error');
        break;
      default:
        console.error('API Error:', error);
    }
  } else {
    navigate('/server-error');
  }
};