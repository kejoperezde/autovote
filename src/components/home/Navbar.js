import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { signInWithGoogle, handleLogout } from "../../api/firebase.config"; // Asegúrate de importar las funciones de autenticación
import { getAuth, onAuthStateChanged } from "firebase/auth";
import apiClient from "../../api/client";

const Navbar = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(null);

  // Comprobar el estado de autenticación cuando el componente se monta
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); // Si hay un usuario autenticado, actualizamos el estado
      } else {
        setUser(null); // Si no hay usuario, limpiamos el estado
      }
    });
    return () => unsubscribe(); // Limpiamos el listener cuando el componente se desmonte
  }, []);

  // Función para manejar el inicio de sesión
  const handleLogin = async () => {
    try {
      const loggedInUser = await signInWithGoogle();
      setLoading(true); // Empieza la carga

      if (loggedInUser) {
        setUser(loggedInUser);

        const userk = await searchUserByEmail(
          loggedInUser.email,
          loggedInUser.photoURL
        );

        setLoading(false); // Oculta la carga ANTES de navegar

        if (userk) {
          login(userk);
          navigate("/dashboard");
        } else {
          navigate("/login");
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  };

  async function searchUserByEmail(email, photoURL) {
    try {
      let tipo = "votante";

      let response = await apiClient.get(
        `votante/correo/${encodeURIComponent(email)}`
      );

      if (response.data.error) {
        response = await apiClient.get(
          `politico/correo/${encodeURIComponent(email)}`
        );
        tipo = "candidato";
      }

      if (response.data.error) {
        response = await apiClient.get(
          `administrador/correo/${encodeURIComponent(email)}`
        );
        tipo = "administrador";
      }

      if (response?.data?.correo) {
        const userk = {
          uid: response.data._id,
          photoURL,
          nombre: response.data.nombre,
          apellido: response.data.apellido,
          correo: response.data.correo,
          tipo,
          edad: response.data.edad,
          codigo_postal: response.data.codigo_postal,
          colonia: response.data.colonia,
          ciudad: response.data.ciudad,
          estado: response.data.estado,
        };

        login(userk);

        return userk;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error completo:", error);
    }
  }

  // --- FUNCION PARA CERRAR SESION
  const handleLogoutClick = async () => {
    await handleLogout(); // Llamamos a la función de cierre de sesión de Firebase
    navigate("/"); // Redirigir a la página principal después de cerrar sesión
  };
  // --- FUNCION PARA CERRAR SESION

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-black py-3">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <i className="bi bi-check2-circle me-2"></i>
            <span className="fw-bold">AutoVote</span>
          </Link>

          <button
            className="navbar-toggler border-0"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                {!user ? (
                  <button
                    onClick={handleLogin}
                    className="btn btn-sm btn-light d-flex align-items-center gap-2 px-3"
                  >
                    <img
                      src="https://developers.google.com/identity/images/g-logo.png"
                      alt="Google"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span className="d-none d-sm-inline">Iniciar sesión</span>
                  </button>
                ) : (
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-light me-2 d-none d-lg-inline small">
                      <i className="bi bi-person-circle me-1"></i>
                      {user.displayName || user.email}
                    </span>
                    <button
                      className="btn btn-sm btn-outline-light px-3"
                      onClick={handleLogoutClick}
                    >
                      <i className="bi bi-box-arrow-right me-1"></i>
                      <span className="d-none d-sm-inline">Salir</span>
                    </button>
                  </div>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>
      {loading && (
        <div className="container mt-5 text-center">
          <div
            className="spinner-border text-primary"
            style={{ width: "2rem", height: "2rem" }}
            role="status"
          >
            <span className="visually-hidden">Cargando...</span>
          </div>
          <h4 className="mt-3">Iniciando sesión...</h4>
          <p>Esto puede tomar unos momentos</p>
        </div>
      )}
    </>
  );
};

export default Navbar;
