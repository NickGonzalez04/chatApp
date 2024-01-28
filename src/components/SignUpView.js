import React, { useState } from "react";
import { useUser } from "../userContext";
import { Link } from 'react-router-dom';
import { auth, db } from "../firebase-config";
import { createUserWithEmailAndPassword, updateProfile} from "firebase/auth";
import { get, ref, set } from "firebase/database";

// import { getDatabase, ref, set, push, child, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {

    const { setUser } = useUser();
    const navigate = useNavigate();
    const [ firstName, setFirstName ] = useState("");
    const [ lastName, setLastName ] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // const createNewUserChatChannels = (userId, displayName) => {
    //     const userRef = ref(db, 'users/' + userId);
    //     set(userRef, {
    //         displayName: displayName,
    //     });
    //   };

    const signUpWithEmail = (e) => {
        e.preventDefault();
        createUserWithEmailAndPassword(auth, email, password)
        .then(async(result) => {
          console.log(result);

          await updateProfile(result.user, {
            displayName: firstName + " " + lastName,

          });
           setUser({
                displayName: `${firstName} ${lastName}}`,
                userId: result.user.uid,
            })

        const newUserRef = ref(db, `users/${result.user.uid}`);
         await set(newUserRef, {
            displayName: firstName + " " + lastName,
            email: result.user.email,
        });

        const channelsRef = ref(db, 'channels');
        const channelsSnapshot = await get(channelsRef);

        if (channelsSnapshot.exists()) {
            const channels = channelsSnapshot.val();

            // Iterate over channels and update the user's displayName
            for (const channelId in channels) {
                if (channels[channelId].users && channels[channelId].users[result.user.uid]) {
                    const channelUserRef = ref(db, `channels/${channelId}/users/${result.user.uid}`);
                    await set(channelUserRef, firstName + " " + lastName);
                }
            }
        }

    
          navigate("/chat");
        }).catch((error) => {
            console.log(error.message);
        });
    };

    return (
    
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Sign Up
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={signUpWithEmail} className="space-y-6" action="#" method="POST">
          <div>
          <div className="flex items-center justify-between">
              <label className="block text-sm font-medium leading-6 text-gray-900">
                First Name
              </label>
            </div>
              <div className="mt-2">
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="firstName"
                  required
                  onChange={(e) => setFirstName(e.target.value)}
                  value={firstName}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Last Name
              </label>
            </div>
              <div className="mt-2">
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="lastName"
                  required
                  onChange={(e) => setLastName(e.target.value)}
                  value={lastName}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div>
            <div className="flex items-center justify-between">
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                Email address
              </label>
            </div>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                  Password
                </label>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign Up
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm text-gray-500">
            Already a user?{' '}
            <Link to="/signin" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
             Sign In
            </Link>
          </p>
        </div>
      </div>
    );
}

export default SignUp;