const Loader = ({ inline = false }) => {
  const style = {
    background: `conic-gradient(var(--primary), var(--primary-light), var(--primary-50), transparent 95%)`,
    maskImage: "radial-gradient(circle, transparent 50%, black 51%)",
    WebkitMaskImage: "radial-gradient(circle, transparent 50%, black 51%)",
  };

  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-2">
        <div className="w-12 h-12 rounded-full animate-spin-slow" style={style} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
      <div className="w-16 h-16 rounded-full animate-spin-slow" style={style} />
    </div>
  );
};

export default Loader;
