import { Post, Story, Notification, User } from '../types';
import { StoryGroup } from '../lib/api/stories';

export interface OutletContextType {
  currentUser: User;
  darkMode: boolean;
  toggleDarkMode: () => void;
  triggerToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  startCall: (userId: string, type?: 'audio' | 'video') => Promise<void>;
  posts: Post[];
  postsLoading: boolean;
  postsError: Error | null;
  isInfiniteLoading: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
  handleLikeToggle: (postId: string) => void;
  handleBookmarkToggle: (postId: string) => void;
  handleAddComment: (postId: string, content: string) => Promise<void>;
  handleDeletePost: (postId: string) => Promise<void>;
  storyGroups: StoryGroup[];
  liveNotifications: Notification[];
  showAddStoryModal: boolean;
  setShowAddStoryModal: (show: boolean) => void;
  handleStoryAdded: (imageSrc: string) => Promise<void>;
  handleViewStory: (story: Story) => void;
  handleMarkAllNotificationsAsRead: () => Promise<void>;
  postMenuPostId: string | null;
  setPostMenuPostId: (id: string | null) => void;
  showPermissionDenied: (type: 'camera' | 'microphone') => void;
}
