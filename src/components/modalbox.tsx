import Image from 'next/image';
import React from 'react';
import {  Zap, MessageCircle, ExternalLink } from 'lucide-react';
import ChatInGroup from '../../public/chatingroupphoto.jpg';

const Modal = ({ onClose }: {title: string; message: string;  onClose: () => void }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <MessageCircle className="mr-2 text-red-500" size={24} />
            About This Chat Group
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24">
              <path fill="currentColor" d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6L8.4 17Zm3.6 5q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Image
            src={ChatInGroup}
            alt="App Image"
            width={100}
            height={100}
            className="w-full h-auto rounded-lg mb-6 shadow-md"
          />

          <p className="text-gray-700 mb-4">
            Welcome to the live group chat built with modern web technologies.
          </p>

          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <Zap className="mr-2 text-yellow-500" size={20} />
              Cool Features
            </h3>
            <ul className="list-disc list-inside pl-4 text-gray-700 space-y-1">
              <li>Send messages</li>
              <li>Share photos</li>
              <li>Use emojis</li>
              <li>Random avatars based on usernames</li>
              <li>Bot commands for extra fun</li>
              <li>  Type <code className="bg-gray-100 px-1 rounded text-sm">'Help'</code> or <code className="bg-gray-100 px-1 rounded text-sm">'Bot'</code> for command details.</li>
            </ul>
          </div>



          {/* SVG Icons Marketing Section */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
            <div className="flex items-center mb-3">


              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" className="mr-3"><path fill="currentColor" d="M16 0c-1.995 0-3.667 1.287-4.328 2.896a4.467 4.467 0 0 0-.317 1.885a4.602 4.602 0 0 0-1.557-1.109a4.657 4.657 0 0 0-1.953-.344a4.668 4.668 0 0 0-3.156 1.36c-1.412 1.411-1.683 3.5-1.016 5.109c.235.572.625 1.088 1.088 1.536a4.646 4.646 0 0 0-1.864.339C1.288 12.333.001 14.005.001 16s1.287 3.667 2.896 4.328c.577.245 1.229.333 1.885.317c-.479.448-.869.975-1.109 1.557c-.667 1.609-.396 3.699 1.016 5.109c1.411 1.412 3.5 1.683 5.109 1.016c.577-.24 1.104-.631 1.557-1.109c-.021.656.072 1.308.317 1.885c.661 1.609 2.333 2.896 4.328 2.896s3.667-1.287 4.328-2.896c.24-.599.349-1.24.317-1.885c.453.475.975.869 1.557 1.109c1.609.667 3.699.396 5.109-1.016c1.412-1.411 1.683-3.5 1.016-5.109a4.63 4.63 0 0 0-1.109-1.557a4.464 4.464 0 0 0 1.885-.317c1.609-.661 2.896-2.333 2.896-4.328s-1.287-3.667-2.896-4.328a4.546 4.546 0 0 0-1.885-.317c.479-.448.869-.975 1.109-1.557c.667-1.609.396-3.699-1.016-5.109a4.668 4.668 0 0 0-3.156-1.36a4.655 4.655 0 0 0-1.953.344c-.577.24-1.104.631-1.557 1.109a4.464 4.464 0 0 0-.317-1.885C19.667 1.288 17.995.001 16 .001zm-.052 2.151c2.281-.052 3.464 2.709 1.849 4.328v5.193L21.464 8c0-2.26 2.733-3.391 4.328-1.792c1.599 1.595.468 4.328-1.792 4.328l-3.672 3.667h5.193c1.599-1.593 4.328-.463 4.328 1.797s-2.729 3.391-4.328 1.797h-5.193L24 21.464c2.26 0 3.391 2.733 1.792 4.328c-1.595 1.599-4.328.468-4.328-1.792l-3.667-3.672v5.193c1.593 1.599.463 4.328-1.797 4.328s-3.391-2.729-1.797-4.328v-5.193L10.536 24c0 2.26-2.733 3.391-4.328 1.792C4.609 24.197 5.74 21.464 8 21.464l3.672-3.667H6.479C4.88 19.39 2.151 18.26 2.151 16s2.729-3.391 4.328-1.797h5.193L8 10.536c-2.26 0-3.391-2.733-1.792-4.328C7.803 4.609 10.536 5.74 10.536 8l3.667 3.672V6.479c-1.577-1.577-.489-4.281 1.745-4.328z" /></svg>
              <h3 className="text-lg font-semibold text-red-600">
                Free SVG Icons
              </h3>
            </div>
            <p className="text-gray-700 mb-3">
              Discover over 200,000 free, open-source SVG icons for your projects!
            </p>
            <a
              href="https://freesvgicons.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:text-blue-800 transition-colors"
            >
              <ExternalLink className="mr-2 text-red-500" size={16} />
              Explore Free SVG Icons
            </a>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="bg-gray-50 border-t p-4 flex justify-between items-center">
          <a 
            href="https://github.com/Nextjswebdev/group_chat" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-gray-700 hover:text-black transition-colors"
          >
            <Github className="mr-2" size={20} />
            View Source Code
          </a>
          <span className="text-xs text-gray-500">v1.0.0</span>
        </div> */}
      </div>
    </div>
  );
};

export default Modal;