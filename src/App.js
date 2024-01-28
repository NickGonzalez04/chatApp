import './App.css';
import React, { useEffect } from 'react';
import SignUpView from './components/SignUpView';
import ChatView from './components/ChatView';
import { useUser } from './userContext';

function App() {
  const { user } = useUser();
  
 useEffect(() => {
  console.log("user changes", user);
  }, [user]);


  return (
    <div className="App">
      {!user && !user?.displayName ? (
      <SignUpView />
      ) : (
      <ChatView />
      )}
    </div>
  );
  
}

export default App;
