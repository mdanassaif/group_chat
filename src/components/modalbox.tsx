import Image from 'next/image';
import React from 'react';
import ChatInGroup from '../../public/chatingroupphoto.jpg'

const Modal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">About This Chat Group</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24">
              <path fill="currentColor" d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6L8.4 17Zm3.6 5q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Z" />
            </svg>
          </button>
        </div>
        <div className="text-sm text-gray-700">
          <Image src={ChatInGroup} alt="App Image" width={100} height={100} className="w-full h-auto rounded-lg mb-4" />
          <p>Welcome to the live group chat built with <strong>Next.js</strong>, <strong>Firebase</strong>, <strong>Tailwind CSS</strong>, <strong>IconBuddy</strong>, <strong>Multiavatar</strong>, <strong>Culrs</strong>, and <strong>Vercel</strong>.</p>
          <p className="mt-4"><strong>Users can:</strong></p>
          <ul className="list-disc list-inside pl-4 mt-2">
            <li>Send messages</li>
            <li>Share photos</li>
            <li>Use emojis</li>
            <li>Enjoy random avatars based on their usernames</li>
            <li>Use Bot commands</li>
          </ul>
          <p className="mt-4"><strong>Invite friends and SoloLearners</strong> to join the chat!</p>
          <p className="mt-4">Meet our friendly <strong>Bot</strong> that fetches jokes, facts, and advice to keep chats lively.</p>
          <p className="mt-4">Type <strong>'Help'</strong> or <strong>'Bot'</strong> for commands info.</p>
          <p className="mt-4">Source code: <a href="https://github.com/Nextjswebdev/group_chat" className="text-blue-500 underline">Github link</a></p>
        </div>
      </div>
    </div>
  );
};

export default Modal;
