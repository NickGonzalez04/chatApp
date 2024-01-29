import React, { useState, Fragment, useEffect, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  CalendarIcon,
  ChartPieIcon,
  ChatBubbleLeftIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  PaperAirplaneIcon,
  UsersIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useUser } from "../userContext";
import { db } from "../firebase-config";
import { ref, set, off, get, push, update, onValue } from "firebase/database";

const ChatView = () => {
  const { user } = useUser();
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [channelsWithNewMessages, setChannelsWithNewMessages] = useState([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState({});
  const endOfMessagesRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [channels, setChannels] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);


  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  const navigation = [
    { name: "Dashboard", href: "#", icon: HomeIcon, current: true },
    { name: "Team", href: "#", icon: UsersIcon, current: false },
    { name: "Projects", href: "#", icon: ChatBubbleLeftIcon, current: false },
    { name: "Calendar", href: "#", icon: CalendarIcon, current: false },
    {
      name: "Documents",
      href: "#",
      icon: DocumentDuplicateIcon,
      current: false,
    },
  ];

  const classNames = (...classes) => {
    return classes.filter(Boolean).join(" ");
  };

  const handleEditClick = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditText(currentText);
  };

  // Edit selected message
  const handleSaveEdit = async (messageId) => {
    try {
      
      const messageRef = ref(
        db,
        `channels/${selectedChannelId}/messages/${messageId}`
      );
      await update(messageRef, { text: editText });

      // Reset editing state
      setEditingMessageId(null);
      setEditText("");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (user) {
      const channelsRef = ref(db, `users/${user.userId}/channels`);
      get(channelsRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            setChannels(snapshot.val());
          } else {
            console.log("No data available");
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }, [user]);

  // Fetch messages from the selected channel
  useEffect(() => {
    if (selectedChannelId) {
      const messagesRef = ref(db, `channels/${selectedChannelId}`);
      get(messagesRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            console.log("messages", snapshot.val());
            const messagesArray = Object.entries(snapshot.val().messages).map(
              ([key, value]) => ({
                id: key,
                ...value,
              })
            );

            setMessages(messagesArray);
          } else {
            console.log("No messages in this channel");
            setMessages([]);
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }, [selectedChannelId]);

  // Listen for new messages in the selected channel
  useEffect(() => {
    if (selectedChannelId) {
      const messagesRef = ref(db, `channels/${selectedChannelId}/messages`);

      // Listen for real-time updates
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
          const updatedMessages = [];
          snapshot.forEach((childSnapshot) => {
            updatedMessages.push({
              id: childSnapshot.key,
              ...childSnapshot.val(),
            });
          });
          setMessages(updatedMessages);
        } else {
          setMessages([]);
        }
      });

      return () => unsubscribe();
    }
  }, [selectedChannelId]);

  const updateReadTimeForChannel = async (channelId) => {
    const channelRef = ref(db, `users/${user.userId}/channels/${channelId}`);
    set(channelRef, {
      lastRead: new Date().getTime(),
      subsribed: true,
    });
  };

  const getLastMessage = (messages) => {
    const lastMessageKey = Object.keys(messages).pop();
    updateReadTimeForChannel(selectedChannelId);
    return messages[lastMessageKey];
  };

  const getLastReadTimeForChannel = async (channelId) => {
    const lastReadRef = ref(
      db,
      `users/${user.userId}/channels/${channelId}/lastRead`
    );
    const snapshot = await get(lastReadRef);
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return 0; // default value indicating no messages have been read
    }
  };

  // Update the unread messages count for each channel
  const updateUnreadMessagesCount = async () => {
    const channelIds = Object.keys(channels);
    const unreadMessagesCount = {};
    for (const channelId of channelIds) {
      const lastRead = await getLastReadTimeForChannel(channelId);
      const messagesRef = ref(db, `channels/${channelId}/messages`);
      const snapshot = await get(messagesRef);
      if (snapshot.exists()) {
        const messages = snapshot.val();
        const lastMessage = getLastMessage(messages);
        if (new Date(lastMessage.createdAt).getTime() > lastRead) {
          unreadMessagesCount[channelId] = Object.values(messages).filter(
            (message) => new Date(message.createdAt).getTime() > lastRead
          ).length;
        }
      }
    }
    setUnreadMessagesCount(unreadMessagesCount);
  };

  useEffect(() => {
    const channelIds = Object.keys(channels);
    channelIds.forEach(async (channelId) => {
      const messagesRef = ref(db, `channels/${channelId}/messages`);
      onValue(messagesRef, async (snapshot) => {
        if (snapshot.exists()) {
          const messages = snapshot.val();
          const lastMessage = getLastMessage(messages);

          if (
            lastMessage.senderId !== user.userId &&
            channelId !== selectedChannelId
          ) {
            const lastRead = await getLastReadTimeForChannel(channelId);

            console.log("lastRead", lastRead);
            if (new Date(lastMessage.createdAt).getTime() > lastRead) {
              updateUnreadMessagesCount(channelId, messages);
              setChannelsWithNewMessages((prevState) => {
                // Add the channelId to the list if it's not already there
                return prevState.includes(channelId)
                  ? prevState
                  : [...prevState, channelId];
              });
            }
          }
        }
      });
    });

    return () => {
      channelIds.forEach((channelId) => {
        const messagesRef = ref(db, `channels/${channelId}/messages`);
        off(messagesRef);
      });
    };
  }, [user.userId, selectedChannelId]);

  const formatChatDate = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);

    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
        return "Today";
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    } else {
        return messageDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    };

  const resetUnreadMessagesCount = (channelId) => {
    setUnreadMessagesCount((prevCounts) => ({
      ...prevCounts,
      [channelId]: 0, // Reset the count for the viewed channel
    }));
  };

  const handleChannelClick = (channelId) => {
    setSelectedChannelId(channelId);
    resetUnreadMessagesCount(channelId);
    // Remove new message alert for this channel
    setChannelsWithNewMessages((prevState) => {
      return prevState.filter((id) => id !== channelId);
    });
  };

  const sendMessageToChannel = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    try {
      const messagesRef = ref(db, `channels/${selectedChannelId}/messages`);
      await push(messagesRef, {
        text: currentMessage,
        senderId: user.userId,
        createdAt: new Date().toISOString(),
      });

      setMessages([
        ...messages,
        {
          text: currentMessage,
          senderId: user.userId,
          createdAt: new Date().toISOString(),
        },
      ]);
      console.log("currentMessage", currentMessage);

      setCurrentMessage("");
    } catch (error) {
      console.error(error);
    }
  };


  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50 lg:hidden"
            onClose={setSidebarOpen}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button
                        type="button"
                        className="-m-2.5 p-2.5"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </Transition.Child>

                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-2 ring-1 ring-white/10">
                    <div className="flex h-16 shrink-0 items-center">
                      <img
                        className="h-8 w-auto"
                        src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500"
                        alt="Your Company"
                      />
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="-mx-2 flex-1 space-y-1">
                        {navigation.map((item) => (
                          <li key={item.name}>
                            <a
                              href={item.href}
                              className={classNames(
                                item.current
                                  ? "bg-gray-800 text-white"
                                  : "text-gray-400 hover:text-white hover:bg-gray-800",
                                "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                              )}
                            >
                              <item.icon
                                className="h-6 w-6 shrink-0"
                                aria-hidden="true"
                              />
                              {item.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-20 lg:overflow-y-auto lg:bg-gray-900 lg:pb-4">
          <div className="flex h-16 shrink-0 items-center justify-center">
            <img
              className="h-8 w-auto"
              src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=500"
              alt="Your Company"
            />
          </div>
          <nav className="mt-8">
            <ul role="list" className="flex flex-col items-center space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={classNames(
                      item.current
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800",
                      "group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold"
                    )}
                  >
                    <item.icon
                      className="h-6 w-6 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="sr-only">{item.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-900 px-4 py-4 shadow-sm sm:px-6 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 text-sm font-semibold leading-6 text-white">
            Dashboard
          </div>
          <a href="#">
            <span className="sr-only">Your profile</span>
            <img
              className="h-8 w-8 rounded-full bg-gray-800"
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt=""
            />
          </a>
        </div>
        <main className="lg:pl-20 flex-1 flex flex-col">
          <div className="xl:pl-96">
            <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6 flex flex-col h-screen">
              <h1 className="text-3xl font-bold leading-tight tracking-tight px-4 text-gray-900">
                Chat {selectedChannelId}
              </h1>
              {/* Messages */}
            
              <div className="flex-1 overflow-y-auto px-4">
                {messages?.length > 0 ? (messages.map((message, index) => {

                    const showDateHeader =
                    index === 0 ||
                    formatChatDate(message.createdAt) !== formatChatDate(messages[index - 1].createdAt);

                    return (
                    <React.Fragment key={message.id}>
                    {showDateHeader && (
                        <div className="text-center text-gray-500 mt-4">
                        <span className="bg-white px-2">{formatChatDate(message.createdAt)}</span>
                        </div>
                    )}
                  <div
                    key={index}
                    className={`p-2 m-4 rounded-lg max-w-xs lg:max-w-md ${
                      message.senderId === user.userId
                        ? "bg-blue-100 ml-auto"
                        : "bg-gray-100 mr-auto"
                    }`}
                  >
                    {editingMessageId === message.id ? (
                      <div>
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="p-2 border border-gray-300 rounded-md"
                        />
                        <button
                          onClick={() => handleSaveEdit(message.id)}
                          className="text-indigo-500 p-2 hover:text-indigo-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="text-red-500 p-2 hover:text-red-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <strong>{message.senderId}</strong>: {message.text}
                        <br />
                        <small className="text-xs text-gray-500">
                          Sent at:{" "}
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </small>
                        {message.senderId === user.userId && (
                          <button
                            onClick={() =>
                              handleEditClick(message.id, message.text)
                            }
                            className="text-indigo-500 ml-2 hover:text-indigo-500"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                       </React.Fragment>
                )})): (
                    <p className="text-center text-gray-500 mt-4">No messages yet</p>
                    )}
                    <div ref={endOfMessagesRef}/>
              </div>
    
              <div className="sticky bottom-0 bg-white py-2 px-4">
                <form
                  onSubmit={sendMessageToChannel}
                  className="flex items-center"
                >
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Type here..."
                    className="block px-2 w-full rounded-md border-0 py-1.5 text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center bg-indigo-500 text-white px-4 py-2 rounded-r-xl hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <PaperAirplaneIcon
                      className="ml-2 -mr-1 h-5 w-6 transform rotate-360"
                      aria-hidden="true"
                    />
                  </button>
                </form>
              </div>
         
            </div>
          </div>
        </main>

        <aside className="fixed inset-y-0 left-20 hidden w-96 overflow-y-auto border-r border-gray-200 px-4 py-6 sm:px-6 lg:px-8 xl:block">
          <ul className="space-y-3">
            {Object.keys(channels).map((channelId) => {
            
              const unreadCount = unreadMessagesCount[channelId] || 0;

              return (
                <li
                  key={channelId}
                  className="group flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-md cursor-pointer"
                  onClick={() => handleChannelClick(channelId)}
                >
                <UserCircleIcon className="flex-shrink-0 h-8 w-8 text-gray-700 mr-2" />
                  <span className="font-small text-gray-700">
                  Channel {channelId.slice(0,3)}...{channelId.slice(-6)}
                  </span>
                  {channelsWithNewMessages.includes(channelId) && (
                    <div className="flex items-center">
                      <span className="flex-shrink-0 mr-2">
                        <span className="relative">
                          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      </span>
                      <span className="bg-red-100 text-red-600 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-md">
                        Unread({unreadCount})
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </>
  );
};

export default ChatView;
