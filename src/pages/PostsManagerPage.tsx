import { useEffect, useState } from 'react';
import { Edit2, MessageSquare, Plus, Search, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '../shared/ui';
import { PostItemType, PostListDataType } from 'src/entities/post/model/types';
import { CommentType } from 'src/entities/comment/model/types';
import { UserDetailType, UserType } from 'src/entities/user/model/types';
import { TagType } from 'src/entities/tag/model/types';

const PostListManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // 상태 관리
  const [postList, setPostList] = useState<PostItemType[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(parseInt(queryParams.get('skip') || '0'));
  const [limit, setLimit] = useState(parseInt(queryParams.get('limit') || '10'));
  const [searchQuery, setSearchQuery] = useState(queryParams.get('search') || '');
  const [selectedPost, setSelectedPost] = useState<PostItemType | null>(null);
  const [sortBy, setSortBy] = useState(queryParams.get('sortBy') || '');
  const [sortOrder, setSortOrder] = useState(queryParams.get('sortOrder') || 'asc');
  const [showPostFormDialog, setShowPostFormDialog] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', body: '', userId: 1 });
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(queryParams.get('tag') || '');
  const [comments, setComments] = useState<{ [postId: number]: CommentType[] }>({});
  const [selectedComment, setSelectedComment] = useState<CommentType | null>(null);
  const [newComment, setNewComment] = useState<CommentType>({
    id: 0,
    body: '',
    postId: undefined,
    userId: 1,
    likes: 0,
    user: { id: 0, username: '' },
  });
  const [showCommentFormDialog, setShowCommentFormDialog] = useState(false);
  const [showPostDetailDialog, setShowPostDetailDialog] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetailType | null>(null);

  console.log('selectedUser', selectedUser);

  // URL 업데이트 함수
  const updateURL = () => {
    const params = new URLSearchParams();
    if (skip) params.set('skip', skip.toString());
    if (limit) params.set('limit', limit.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    if (selectedTag) params.set('tag', selectedTag);
    navigate(`?${params.toString()}`);
  };

  // 게시물 가져오기
  const fetchPostList = () => {
    setLoading(true);
    let postListData: PostListDataType;
    let usersData: UserType[];

    fetch(`/api/postList?limit=${limit}&skip=${skip}`)
      .then((response) => response.json())
      .then((data: PostListDataType) => {
        postListData = data;
        return fetch('/api/users?limit=0&select=username,image');
      })
      .then((response) => response.json())
      .then((users: { users: UserType[] }) => {
        usersData = users.users;
        const postListWithUsers = postListData.postList.map((post: PostItemType) => ({
          ...post,
          author: usersData.find((user) => user.id === post.userId),
        }));
        setPostList(postListWithUsers);
        setTotal(postListData.total);
      })
      .catch((error) => {
        console.error('게시물 가져오기 오류:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // 태그 가져오기
  const fetchTags = async () => {
    try {
      const response = await fetch('/api/postList/tags');
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error('태그 가져오기 오류:', error);
    }
  };

  // 게시물 검색
  const searchPostList = async () => {
    if (!searchQuery) {
      fetchPostList();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/postList/search?q=${searchQuery}`);
      const data = await response.json();
      setPostList(data.postList);
      setTotal(data.total);
    } catch (error) {
      console.error('게시물 검색 오류:', error);
    }
    setLoading(false);
  };

  // 태그별 게시물 가져오기
  const fetchPostListByTag = async (tag: string) => {
    if (!tag || tag === 'all') {
      fetchPostList();
      return;
    }
    setLoading(true);
    try {
      const [postListResponse, usersResponse] = await Promise.all([
        fetch(`/api/postList/tag/${tag}`),
        fetch('/api/users?limit=0&select=username,image'),
      ]);
      const postListData = await postListResponse.json();
      const usersData = await usersResponse.json();

      const postListWithUsers: PostItemType[] = postListData.postList.map((post: PostItemType) => ({
        ...post,
        author: usersData.users.find((user: UserType) => user.id === post.userId),
      }));

      setPostList(postListWithUsers);
      setTotal(postListData.total);
    } catch (error) {
      console.error('태그별 게시물 가져오기 오류:', error);
    }
    setLoading(false);
  };

  // 게시물 추가/수정
  const handlePostForm = async () => {
    try {
      if (selectedPost) {
        // 수정 모드
        const response = await fetch(`/api/postList/${selectedPost?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selectedPost),
        });

        const data = await response.json();

        setPostList(postList.map((post) => (post.id === data.id ? data : post)));
      } else {
        // 추가 모드
        const response = await fetch('/api/postList/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPost),
        });

        const data = await response.json();

        setPostList([data, ...postList]);
        setShowPostFormDialog(false);
      }
    } catch (error) {
      console.error('게시물 처리 오류:', error);
    } finally {
      setShowPostFormDialog(false);
      setSelectedPost(null);
      // 폼 초기화
      setNewPost({ title: '', body: '', userId: 0 });
    }
  };

  // 게시물 삭제
  const deletePost = async (id: number) => {
    try {
      await fetch(`/api/postList/${id}`, {
        method: 'DELETE',
      });

      setPostList(postList.filter((post) => post.id !== id));
    } catch (error) {
      console.error('게시물 삭제 오류:', error);
    }
  };

  // 댓글 가져오기
  const fetchComments = async (postId: number) => {
    if (comments[postId]) return; // 이미 불러온 댓글이 있으면 다시 불러오지 않음
    try {
      const response = await fetch(`/api/comments/post/${postId}`);

      const data = await response.json();
      setComments((prev) => ({ ...prev, [postId]: data.comments }));
    } catch (error) {
      console.error('댓글 가져오기 오류:', error);
    }
  };

  // 댓글 추가/수정
  const handleCommentForm = async () => {
    try {
      if (selectedComment) {
        // 수정 모드
        const response = await fetch(`/api/comments/${selectedComment?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selectedComment),
        });

        const data = await response.json();

        if (!data.postId) {
          console.error('댓글 수정 오류:', data);
          return;
        }

        setComments((prev) => ({
          ...prev,
          [data.postId]: prev[data.postId].map((comment) =>
            comment.id === data.id ? data : comment,
          ),
        }));
      } else {
        // 추가 모드
        const response = await fetch('/api/comments/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newComment),
        });

        const data = await response.json();

        setComments((prev) => ({
          ...prev,
          [data.postId]: [...(prev[data.postId] || []), data],
        }));
      }
    } catch (error) {
      console.error('댓글 처리 오류:', error);
    } finally {
      setShowCommentFormDialog(false);
      setSelectedComment(null);
      // 폼 초기화
      setNewComment({
        id: 0,
        body: '',
        postId: undefined,
        userId: 1,
        likes: 0,
        user: { id: 0, username: '' },
      });
    }
  };

  // 댓글 삭제
  const deleteComment = async (id: number, postId: number) => {
    try {
      await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
      });

      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].filter((comment) => comment.id !== id),
      }));
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
    }
  };

  // 댓글 좋아요
  const likeComment = async (id: number, postId: number) => {
    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          likes: (comments[postId]?.find((c) => c.id === id)?.likes || 0) + 1,
        }),
      });

      const data = await response.json();

      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].map((comment) =>
          comment.id === data.id ? { ...data, likes: comment.likes + 1 } : comment,
        ),
      }));
    } catch (error) {
      console.error('댓글 좋아요 오류:', error);
    }
  };

  // 게시물 상세 보기
  const openPostDetail = (post: PostItemType) => {
    setSelectedPost(post);
    fetchComments(post.id);
    setShowPostDetailDialog(true);
  };

  // 사용자 모달 열기
  const openUserModal = async (user: UserType) => {
    try {
      const response = await fetch(`/api/users/${user.id}`);
      const userData = await response.json();

      setSelectedUser(userData);
      setShowUserModal(true);
    } catch (error) {
      console.error('사용자 정보 가져오기 오류:', error);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (selectedTag) {
      fetchPostListByTag(selectedTag);
    } else {
      fetchPostList();
    }
    updateURL();
  }, [skip, limit, sortBy, sortOrder, selectedTag]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSkip(parseInt(params.get('skip') || '0'));
    setLimit(parseInt(params.get('limit') || '10'));
    setSearchQuery(params.get('search') || '');
    setSortBy(params.get('sortBy') || '');
    setSortOrder(params.get('sortOrder') || 'asc');
    setSelectedTag(params.get('tag') || '');
  }, [location.search]);

  // 하이라이트 함수 추가
  const highlightText = (text: string, highlight: string) => {
    if (!text) return null;
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
        )}
      </span>
    );
  };

  // 게시물 테이블 렌더링
  const renderPostTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-[50px]'>ID</TableHead>
          <TableHead>제목</TableHead>
          <TableHead className='w-[150px]'>작성자</TableHead>
          <TableHead className='w-[150px]'>반응</TableHead>
          <TableHead className='w-[150px]'>작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {postList.map((post) => (
          <TableRow key={post.id}>
            <TableCell>{post.id}</TableCell>
            <TableCell>
              <div className='space-y-1'>
                <div>{highlightText(post.title, searchQuery)}</div>

                <div className='flex flex-wrap gap-1'>
                  {post.tags?.map((tag) => (
                    <span
                      key={tag}
                      className={`px-1 text-[9px] font-semibold rounded-[4px] cursor-pointer ${
                        selectedTag === tag
                          ? 'text-white bg-blue-500 hover:bg-blue-600'
                          : 'text-blue-800 bg-blue-100 hover:bg-blue-200'
                      }`}
                      onClick={() => {
                        setSelectedTag(tag);
                        updateURL();
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div
                className='flex items-center space-x-2 cursor-pointer'
                onClick={() => post.author && openUserModal(post.author)}
              >
                <img
                  src={post.author?.image}
                  alt={post.author?.username}
                  className='w-8 h-8 rounded-full'
                />
                <span>{post.author?.username}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className='flex items-center gap-2'>
                <ThumbsUp className='w-4 h-4' />
                <span>{post.reactions?.likes || 0}</span>
                <ThumbsDown className='w-4 h-4' />
                <span>{post.reactions?.dislikes || 0}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className='flex items-center gap-2'>
                <Button variant='ghost' size='sm' onClick={() => openPostDetail(post)}>
                  <MessageSquare className='w-4 h-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setSelectedPost(post);
                    setShowPostFormDialog(true);
                  }}
                >
                  <Edit2 className='w-4 h-4' />
                </Button>
                <Button variant='ghost' size='sm' onClick={() => deletePost(post.id)}>
                  <Trash2 className='w-4 h-4' />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // 댓글 렌더링
  const renderComments = (postId: number) => (
    <div className='mt-2'>
      <div className='flex items-center justify-between mb-2'>
        <h3 className='text-sm font-semibold'>댓글</h3>
        <Button
          size='sm'
          onClick={() => {
            setNewComment((prev) => ({ ...prev, postId: postId as CommentType['postId'] }));
            setShowCommentFormDialog(true);
          }}
        >
          <Plus className='w-3 h-3 mr-1' />
          댓글 추가
        </Button>
      </div>
      <div className='space-y-1'>
        {comments[postId]?.map((comment) => (
          <div key={comment.id} className='flex items-center justify-between text-sm border-b pb-1'>
            <div className='flex items-center space-x-2 overflow-hidden'>
              <span className='font-medium truncate'>{comment.user.username}:</span>
              <span className='truncate'>{highlightText(comment.body, searchQuery)}</span>
            </div>
            <div className='flex items-center space-x-1'>
              <Button variant='ghost' size='sm' onClick={() => likeComment(comment.id, postId)}>
                <ThumbsUp className='w-3 h-3' />
                <span className='ml-1 text-xs'>{comment.likes}</span>
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSelectedComment(comment);
                  setShowCommentFormDialog(true);
                }}
              >
                <Edit2 className='w-3 h-3' />
              </Button>
              <Button variant='ghost' size='sm' onClick={() => deleteComment(comment.id, postId)}>
                <Trash2 className='w-3 h-3' />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className='w-full max-w-6xl mx-auto'>
      <CardHeader>
        <CardTitle className='flex items-center justify-between'>
          <span>게시물 관리자</span>
          <Button onClick={() => setShowPostFormDialog(true)}>
            <Plus className='w-4 h-4 mr-2' />
            게시물 추가
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col gap-4'>
          {/* 검색 및 필터 컨트롤 */}
          <div className='flex gap-4'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='게시물 검색...'
                  className='pl-8'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchPostList()}
                />
              </div>
            </div>
            <Select
              value={selectedTag}
              onValueChange={(value) => {
                setSelectedTag(value);
                fetchPostListByTag(value);
                updateURL();
              }}
            >
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='태그 선택' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>모든 태그</SelectItem>
                {tags.map((tag: TagType) => (
                  <SelectItem key={tag.url} value={tag.slug}>
                    {tag.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='정렬 기준' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>없음</SelectItem>
                <SelectItem value='id'>ID</SelectItem>
                <SelectItem value='title'>제목</SelectItem>
                <SelectItem value='reactions'>반응</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='정렬 순서' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='asc'>오름차순</SelectItem>
                <SelectItem value='desc'>내림차순</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 게시물 테이블 */}
          {loading ? <div className='flex justify-center p-4'>로딩 중...</div> : renderPostTable()}

          {/* 페이지네이션 */}
          <div className='flex justify-between items-center'>
            <div className='flex items-center gap-2'>
              <span>표시</span>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='10' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='20'>20</SelectItem>
                  <SelectItem value='30'>30</SelectItem>
                </SelectContent>
              </Select>
              <span>항목</span>
            </div>
            <div className='flex gap-2'>
              <Button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))}>
                이전
              </Button>
              <Button disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)}>
                다음
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* 게시물 추가/수정 대화상자 */}
      <Dialog open={showPostFormDialog} onOpenChange={setShowPostFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPost ? '게시물 수정' : '새 게시물 추가'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <Input
              placeholder='제목'
              value={selectedPost ? selectedPost.title : newPost.title}
              onChange={(e) =>
                selectedPost
                  ? setSelectedPost({ ...selectedPost, title: e.target.value })
                  : setNewPost({ ...newPost, title: e.target.value })
              }
            />
            <Textarea
              rows={selectedPost ? 15 : 30}
              placeholder='내용'
              value={selectedPost ? selectedPost.body : newPost.body}
              onChange={(e) =>
                selectedPost
                  ? setSelectedPost({ ...selectedPost, body: e.target.value })
                  : setNewPost({ ...newPost, body: e.target.value })
              }
            />
            {!selectedPost && (
              <Input
                type='number'
                placeholder='사용자 ID'
                value={newPost.userId}
                onChange={(e) => setNewPost({ ...newPost, userId: Number(e.target.value) })}
              />
            )}
            <Button onClick={handlePostForm}>
              {selectedPost ? '게시물 업데이트' : '게시물 추가'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 댓글 추가/수정 대화상자 */}
      <Dialog open={showCommentFormDialog} onOpenChange={setShowCommentFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedComment ? '댓글 수정' : '새 댓글 추가'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <Textarea
              placeholder='댓글 내용'
              value={selectedComment ? selectedComment.body : newComment.body}
              onChange={(e) =>
                selectedComment
                  ? setSelectedComment({ ...selectedComment, body: e.target.value })
                  : setNewComment({ ...newComment, body: e.target.value })
              }
            />
            <Button onClick={handleCommentForm}>
              {selectedComment ? '댓글 업데이트' : '댓글 추가'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 게시물 상세 보기 대화상자 */}
      <Dialog open={showPostDetailDialog} onOpenChange={setShowPostDetailDialog}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>{highlightText(selectedPost?.title || '', searchQuery)}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <p>{highlightText(selectedPost?.body || '', searchQuery)}</p>
            {selectedPost?.id !== undefined && renderComments(selectedPost.id)}
          </div>
        </DialogContent>
      </Dialog>

      {/* 사용자 모달 */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 정보</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <img
              src={selectedUser?.image}
              alt={selectedUser?.username}
              className='w-24 h-24 rounded-full mx-auto'
            />
            <h3 className='text-xl font-semibold text-center'>{selectedUser?.username}</h3>
            <div className='space-y-2'>
              <p>
                <strong>이름:</strong> {selectedUser?.firstName} {selectedUser?.lastName}
              </p>
              <p>
                <strong>나이:</strong> {selectedUser?.age}
              </p>
              <p>
                <strong>이메일:</strong> {selectedUser?.email}
              </p>
              <p>
                <strong>전화번호:</strong> {selectedUser?.phone}
              </p>
              <p>
                <strong>주소:</strong> {selectedUser?.address?.address},{' '}
                {selectedUser?.address?.city}, {selectedUser?.address?.state}
              </p>
              <p>
                <strong>직장:</strong> {selectedUser?.company?.name} -{' '}
                {selectedUser?.company?.title}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PostListManager;
