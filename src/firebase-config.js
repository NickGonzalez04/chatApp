import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAepxEClUTOaSVwU_Y8votvb8ZSInnkoTs",
    authDomain: "shimmer-chat-app.firebaseapp.com",
    databaseURL: "https://shimmer-chat-app-default-rtdb.firebaseio.com",
    projectId: "shimmer-chat-app",
    storageBucket: "shimmer-chat-app.appspot.com",
    messagingSenderId: "988303309195",
    appId: "1:988303309195:web:b01e79bbdce69f4e41978e",
    measurementId: "G-M7Z77HJQLM"
  };


const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
