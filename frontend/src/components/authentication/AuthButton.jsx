const AuthButton = ({
  text,
  color = 'bg-gray-800 hover:bg-gray-900',
  type = 'button',
  onClick,
  className = '',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${color} cursor-pointer py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ${className}`}
    >
      {text}
    </button>
  );
};

export default AuthButton;