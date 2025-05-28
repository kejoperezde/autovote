import React, { useState, useEffect, useCallback } from "react";
import InternalNavbar from "../components/InternalNavbar";
import apiClient from "../api/client"; // Asegúrate de que la ruta sea correcta
import { useAuth } from "../context/AuthContext";
// FIREBASE
import {
  storage,
  ref,
  uploadBytes,
  getDownloadURL

} from "../api/firebase.config";

const MiPerfil = () => {
  const { user, isLoading } = useAuth();
  const [usuario, setUsuario] = useState({
    _id: "",
    nombre: "",
    apellido: "",
    edad: 0,
    correo: "",
    codigo_postal: "",
    colonia: "",
    ciudad: "",
    estado: "",
    candidatura: "",
    cedula_politica: "",
  });
  const [validacion, setValidacion] = useState(null);
  const [editando, setEditando] = useState(false);
  const [errores, setErrores] = useState({});
  const [formularioValido, setFormularioValido] = useState(false);
  const [datosOriginales, setDatosOriginales] = useState({
    _id: "",
    nombre: "",
    apellido: "",
    edad: 0,
    correo: "",
    codigo_postal: "",
    colonia: "",
    ciudad: "",
    estado: "",
    candidatura: "",
    cedula_politica: "",
  });

  // Realizar petición a la API para obtener los datos del usuario
  useEffect(() => {
    if (!isLoading && user) {
      if (user.uid && user.tipo === "votante") {
        const cargarDatos = async () => {
          const response = await apiClient.get(`votante/${user.uid}`);
          setUsuario(response.data);
          setDatosOriginales(response.data);
          setValidacion(response.data.validacion);
        };
        cargarDatos();
      } else if (user.uid && user.tipo === "candidato") {
        const cargarDatos = async () => {
          const response = await apiClient.get(`politico/${user.uid}`);
          console.log(response.data);
          setUsuario(response.data);
          setDatosOriginales(response.data);
          setValidacion(response.data.validacion);
        };
        cargarDatos();
      } else if (user.uid && user.tipo === "administrador") {
        const cargarDatos = async () => {
          const response = await apiClient.get(`administrador/${user.uid}`);
          setUsuario(response.data);
          setDatosOriginales(response.data);
          setValidacion(response.data.validacion);
        };
        cargarDatos();
      }
    }
  }, [isLoading, user]);

  const validarFormulario = useCallback(() => {
    // Validar datos personales
    if (!usuario.nombre?.trim() ||
      !usuario.apellido?.trim() ||
      usuario.edad <= 17 ||
      usuario.edad > 120) {
      return false;
    }

    // Validar datos de ubicación para votantes y candidatos
    if (user.tipo !== "administrador") {
      if (!usuario.codigo_postal?.trim() ||
        !usuario.colonia?.trim() ||
        !usuario.ciudad?.trim() ||
        !usuario.estado?.trim()) {
        return false;
      }
    }

    // Validar datos de candidatura
    if (user.tipo === "candidato") {
      if (!usuario.candidatura) {
        return false;
      }
      if (validacion === 'invalida' && !file) {
        return false;
      }
    }

    return true;
  }, [usuario, validacion]);

  const handleCancelar = () => {
    setUsuario(datosOriginales); // Restaura los datos originales
    setEditando(false);
    setFile(null);
    setErrores({}); // Limpia los errores
  };

  useEffect(() => {
    setFormularioValido(validarFormulario());
  }, [validarFormulario]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUsuario((prev) => ({
      ...prev,
      [name]: name === "edad" ? parseInt(value) || 0 : value,
    }));

    // Validación en tiempo real para mostrar errores
    if (errores[name]) {
      setErrores(prev => {
        const nuevosErrores = { ...prev };
        delete nuevosErrores[name];
        return nuevosErrores;
      });
    }

    // Validación inmediata para campos requeridos
    if ((name === "nombre" || name === "apellido" || name === "codigo_postal" || name === "colonia" || name === "ciudad" || name === "estado") && !value.trim()) {
      setErrores(prev => ({ ...prev, [name]: "Este campo es requerido" }));
    } else if (name === "edad" && (value <= 17 || value > 120)) {
      setErrores(prev => ({ ...prev, [name]: "Edad inválida" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos antes de continuar
    if (!formularioValido) {
      alert("Por favor complete todos los campos requeridos correctamente");
      return;
    }

    try {
      let cedulaUrl = usuario.cedula_politica;

      // Subir nuevo archivo si hay uno seleccionado
      if (file) {
        cedulaUrl = await handleUpload();
      }

      // Preparar datos para enviar
      const datosActualizados = {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        edad: usuario.edad,
        ...(user.tipo !== "administrador" && {
          codigo_postal: usuario.codigo_postal,
          colonia: usuario.colonia,
          ciudad: usuario.ciudad,
          estado: usuario.estado,
        }),
        ...(user.tipo === "candidato" && {
          candidatura: usuario.candidatura,
          cedula_politica: cedulaUrl,
          validacion: 'pendiente' // Resetear validación al subir nueva cédula
        }),
      };

      // Determinar endpoint
      let endpoint = "";
      if (user.tipo === "votante") endpoint = `votante/${user.uid}`;
      else if (user.tipo === "candidato") endpoint = `politico/${user.uid}`;
      else if (user.tipo === "administrador") endpoint = `administrador/${user.uid}`;

      // Enviar datos
      const response = await apiClient.put(endpoint, datosActualizados);

      if (response.data) {
        setEditando(false);
        setFile(null);
        alert("Datos guardados correctamente");
        // Actualizar estado local con la nueva URL si se subió archivo
        if (file) {
          setUsuario(prev => ({ ...prev, cedula_politica: cedulaUrl }));
          setValidacion('pendiente');
        }
      }
    } catch (error) {
      console.error("Error al guardar los datos:", error);
      alert("Hubo un error al guardar los cambios");
    }
  };

  // --- FIREBASE FILES
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      console.log("Por favor selecciona un archivo");
      return;
    }

    try {
      // 1. Crear referencia con nombre único
      const fileName = `files/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);

      // 2. Subir el archivo
      const snapshot = await uploadBytes(storageRef, file);

      // 3. Obtener URL (usando la referencia del snapshot)
      const url = await getDownloadURL(snapshot.ref);
      //usuario.cedula_politica = url;
      return url;
    } catch (err) {
      console.error("Error completo:", err);
    }
  };
  /*
  const deleteFile = async (fileUrl) => {
    try {
      // Extraer la ruta del archivo de la URL
      const filePath = decodeURIComponent(fileUrl.split('/o/')[1].split('?')[0]);
      const fileRef = ref(storage, filePath);

      await deleteObject(fileRef);
      console.log("Archivo eliminado con éxito");
    } catch (error) {
      console.error("Error al eliminar archivo:", error);
    }
  };
  const handleDeleteFile = async () => {
    // Eliminar archivo anterior si existe
    if (usuario.cedula_politica) {
      try {
        // Extraer la ruta del archivo de la URL (esto puede variar según las URLs)
        const oldFilePath = decodeURIComponent(usuario.cedula_politica)
          .split('/o/')[1]
          .split('?')[0];

        const oldFileRef = ref(storage, oldFilePath);
        await deleteObject(oldFileRef);
        console.log("Archivo anterior eliminado con éxito");
      } catch (error) {
        console.warn("Error al eliminar archivo anterior (puede que no exista):", error);
      }
    }
  }*/
  // --- FIREBASE FILES

  return (
    <>
      <InternalNavbar />
      <div className="container my-5">
        <form onSubmit={handleSubmit}>
          {/* DATOS PERSONALES */}
          <fieldset className="mb-4 border rounded p-3">
            <legend className="w-auto px-2">Datos Personales</legend>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
                  name="nombre"
                  value={usuario.nombre}
                  onChange={handleChange}
                  readOnly={!editando}
                />
                {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label">Apellido</label>
                <input
                  type="text"
                  className={`form-control ${errores.apellido ? 'is-invalid' : ''}`}
                  name="apellido"
                  value={usuario.apellido}
                  onChange={handleChange}
                  readOnly={!editando}
                />
                {errores.apellido && <div className="invalid-feedback">{errores.apellido}</div>}
              </div>
            </div>
            <div className="row">
              <div className="col-md-4">
                <label className="form-label">Edad</label>
                <input
                  type="number"
                  className={`form-control ${errores.edad ? 'is-invalid' : ''}`}
                  name="edad"
                  value={usuario.edad}
                  onChange={handleChange}
                  readOnly={!editando}
                  min="18"
                  max="120"
                />
                {errores.edad && <div className="invalid-feedback">{errores.edad}</div>}
              </div>
              <div className="col-md-8">
                <label className="form-label">Correo</label>
                <input
                  type="email"
                  className="form-control"
                  name="correo"
                  value={usuario.correo}
                  onChange={handleChange}
                  readOnly="true"
                />
              </div>
            </div>
          </fieldset>

          {/* DATOS DE UBICACIÓN */}
          {user && user.tipo !== "administrador" && (
            <fieldset className="mb-4 border rounded p-3">
              <legend className="w-auto px-2">Datos de Ubicación</legend>
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="form-label">Código Postal</label>
                  <input
                    type="text"
                    className={`form-control ${errores.codigo_postal ? 'is-invalid' : ''}`}
                    name="codigo_postal"
                    value={usuario.codigo_postal}
                    onChange={handleChange}
                    readOnly={!editando}
                  />
                  {errores.codigo_postal && <div className="invalid-feedback">{errores.codigo_postal}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Colonia</label>
                  <input
                    type="text"
                    className={`form-control ${errores.colonia ? 'is-invalid' : ''}`}
                    name="colonia"
                    value={usuario.colonia}
                    onChange={handleChange}
                    readOnly={!editando}
                  />
                  {errores.colonia && <div className="invalid-feedback">{errores.colonia}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Ciudad</label>
                  <input
                    type="text"
                    className={`form-control ${errores.ciudad ? 'is-invalid' : ''}`}
                    name="ciudad"
                    value={usuario.ciudad}
                    onChange={handleChange}
                    readOnly={!editando}
                  />
                  {errores.ciudad && <div className="invalid-feedback">{errores.ciudad}</div>}
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label">Estado</label>
                  <input
                    type="text"
                    className={`form-control ${errores.estado ? 'is-invalid' : ''}`}
                    name="estado"
                    value={usuario.estado}
                    onChange={handleChange}
                    readOnly={!editando}
                  />
                  {errores.estado && <div className="invalid-feedback">{errores.estado}</div>}
                </div>
              </div>
            </fieldset>
          )}

          {/* DATOS DE CANDIDATURA */}
          {user && user.tipo === "candidato" && (
            <fieldset className="mb-4 border rounded p-3">
              <legend className="w-auto px-2">Datos de Candidatura</legend>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Tipo de Candidato</label>
                  <select
                    className="form-select"
                    name="candidato"
                    value={usuario.candidatura}
                    onChange={handleChange}
                    disabled={!editando}
                  >
                    <option value="">Seleccione una opción</option>
                    <option value="presidente">Presidente</option>
                    <option value="gobernador">Gobernador</option>
                    <option value="presidente municipal">Presidente municipal</option>
                  </select>
                </div>
                {validacion === 'invalida' ? (
                  <div className="col-md-6">
                    <label className="form-label">Cédula Política &nbsp;</label>
                    <span className="badge bg-danger">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      Cédula no válida
                    </span>
                    <input
                      name="cedula_politica"
                      disabled={!editando}
                      onChange={handleFileChange}
                      type="file"
                      className="form-control btn btn-sm btn-outline-primary me-2"
                      required
                    />
                  </div>
                ) : (
                  <div className="col-md-6">
                    <label className="form-label">Cédula Política &nbsp;</label>
                    {validacion === 'valida' && (
                      <span className="badge bg-success">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        Cédula validada
                      </span>
                    )}
                    {validacion === 'pendiente' && (
                      <span className="badge bg-warning text-dark">
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        Pendiente de validación
                      </span>
                    )}
                    <a
                      className="form-control btn btn-sm btn-outline-primary me-2"
                      href={usuario.cedula_politica}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver Cédula Política
                    </a>
                  </div>
                )}
              </div>
            </fieldset>
          )}

          {/* BOTONES */}
          {user && user.tipo !== "administrador" && (
            <div className="d-flex justify-content-end gap-2">
              {!editando ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setEditando(true)}
                >
                  Editar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelar}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success" disabled={!formularioValido || !editando}>
                    Guardar Cambios
                  </button>
                </>
              )}
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default MiPerfil;
