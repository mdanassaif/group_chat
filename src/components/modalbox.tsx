import Image from 'next/image';
import React from 'react';

const Modal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
      <div className="bg-white w-96 p-4 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">About This Chat Group</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24">
              <path fill="currentColor" d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6L8.4 17Zm3.6 5q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Z"/>
            </svg>
          </button>
        </div>
        <div className="text-sm text-gray-700">
          <Image src="https://pixabay.com/get/gd8c9817be2c3e83ab723c5605b8d17910ddcc17c1a12ee6506da8f104d7fde62a0378e1b22b988e742af796ba21d75aff1477b6e320334aa53d2bdabb8d690f5_1280.jpg" alt="App Image"  width={100} height={100} className="w-full h-auto rounded-lg mb-4" />
          <p>This is a live group chat application built with Next.js, Firebase, Tailwind CSS, IconBuddy, Culrs and Vercel,</p>
          <br/>
          <p>Users can send messages, share photos, use emojis, and enjoy random avatars generated based on their usernames.</p>
          <br/>
          <p>Lets support this group chat by inviting your friends and sololearners to join the gosspis.</p>
        </div>
      </div>
    </div>
  );
};

export default Modal;
