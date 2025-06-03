import AuthProvider from "./components/authentication/AuthProvider";
import Routes from "./Routes";

function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}

export default App;