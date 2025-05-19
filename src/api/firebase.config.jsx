import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Autenticación de Firebase
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
// Almacén de Firebase
const storage = getStorage(app);

// Función para iniciar sesión con Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    // console.log("Usuario autenticado: ", user);
    return user;  // Regresamos el usuario autenticado
  } catch (error) {
    // console.error("Error al iniciar sesión con Google: ", error);
    return null;
  }
};




// Función para cerrar sesión
export const handleLogout = async () => {
  try {
    await signOut(auth);
    console.log("Cerrado sesión con éxito");
  } catch (error) {
    console.error("Error al cerrar sesión: ", error);
  }
};

export { storage, ref, uploadBytes, getDownloadURL };

// Función para iniciar sesión con correo y contraseña
export const signUpWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("Usuario registrado con correo:", user);
    return user;
  } catch (error) {
    console.error("Error en el registro con correo:", error);
    return null;
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("Usuario inició sesión con correo:", user);
    return user;
  } catch (error) {
    console.error("Error al iniciar sesión con correo:", error);
    return null;
  }
};
