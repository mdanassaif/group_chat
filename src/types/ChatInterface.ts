// ChatInterface.ts
export  interface Message {
  id: string;
  text?: string;
  formattedText?: string;
  imageUrl?: string;
  timestamp: number;
  user: string;
  avatarUrl?: string;  // Make this optional
  backgroundColor?: string;
  textColor?: string;
  groupId?: string; // New field for group messages
  
}

export interface TypingUser {
  user: string;
  timestamp: number;
}

export interface OnlineUser {
  user: string;
  lastActive: number;
  avatarUrl: string;
}
 

export interface Group {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: number;
  description?: string;
  avatar?: string;
 
}

 

export interface ChatState {
  selectedGroupId: string | null;
  groups: Group[];
  showCreateGroup: boolean;
  newGroupForm: {
    name: string;
    description: string;
  };
}
 
export interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
  

}

