import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import RecordingDetailContent from './RecordingDetailContent';

function RecordingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleDelete = () => {
    setTimeout(() => {
      navigate('/recordings');
    }, 1000);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <BackButton>返回</BackButton>
        </div>
        <RecordingDetailContent recordingId={id} onDelete={handleDelete} />
      </div>
    </div>
  );
}

export default RecordingDetail;
