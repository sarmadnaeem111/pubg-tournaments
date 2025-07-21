import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Button, Image } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

function TournamentDetails() {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchTournamentDetails();
  }, [tournamentId]);

  async function fetchTournamentDetails() {
    try {
      setLoading(true);
      
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);
      
      if (tournamentSnap.exists()) {
        const tournamentData = {
          id: tournamentSnap.id,
          ...tournamentSnap.data(),
          // Check if current user has joined this tournament
          hasJoined: currentUser ? 
            tournamentSnap.data().participants?.some(p => p.userId === currentUser.uid) : 
            false
        };
        setTournament(tournamentData);
      } else {
        setError('Tournament not found');
      }
    } catch (error) {
      setError('Failed to fetch tournament details: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadgeVariant(status) {
    switch (status) {
      case 'upcoming': return 'primary';
      case 'live': return 'success';
      case 'completed': return 'secondary';
      default: return 'primary';
    }
  }

  function handleBack() {
    navigate(-1);
  }

  if (loading) {
    return (
      <Container className="py-5">
        <p>Loading tournament details...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
        <Button variant="secondary" onClick={handleBack}>Go Back</Button>
      </Container>
    );
  }

  if (!tournament) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Tournament not found</Alert>
        <Button variant="secondary" onClick={handleBack}>Go Back</Button>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Tournament Details</h1>
        <Button variant="secondary" onClick={handleBack}>Go Back</Button>
      </div>
      
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <Badge bg={getStatusBadgeVariant(tournament.status)}>
            {tournament.status.toUpperCase()}
          </Badge>
          <span>{tournament.gameType}</span>
        </Card.Header>
        <Card.Body>
          <Card.Title className="fs-3 mb-3">{tournament.gameName}</Card.Title>
          
          <Row className="mb-4">
            <Col md={6}>
              <h5>Tournament Information</h5>
              <p>
                <strong>Date:</strong> {tournament.tournamentDate?.toDate 
                  ? tournament.tournamentDate.toDate().toLocaleDateString() 
                  : 'N/A'}
                <br />
                <strong>Time:</strong> {tournament.tournamentTime || 'N/A'}
                <br />
                <strong>Entry Fee:</strong> ${tournament.entryFee}
                <br />
                <strong>Prize Pool:</strong> ${tournament.prizePool}
                <br />
                <strong>Participants:</strong> {tournament.participants?.length || 0} / {tournament.maxParticipants}
              </p>
            </Col>
            <Col md={6}>
              <h5>Rules & Requirements</h5>
              <p>{tournament.rules || 'No specific rules provided.'}</p>
            </Col>
          </Row>
          
          {tournament.description && (
            <div className="mb-4">
              <h5>Description</h5>
              <p>{tournament.description}</p>
            </div>
          )}
          
          {tournament.status === 'live' && tournament.matchDetails && (
            <div className="alert alert-success mt-3">
              <h5>Match Details</h5>
              <p>{tournament.matchDetails}</p>
            </div>
          )}
          
          {tournament.status === 'upcoming' && tournament.hasJoined && tournament.matchDetails && (
            <div className="alert alert-info mt-3">
              <h5>Match Details</h5>
              <p>{tournament.matchDetails}</p>
            </div>
          )}
          
          {tournament.status === 'completed' && (
            <div className="mt-4">
              <h5>Results</h5>
              {tournament.results && <p>{tournament.results}</p>}
              {tournament.resultImage && (
                <div className="mt-3">
                  <Image 
                    src={tournament.resultImage} 
                    fluid 
                    thumbnail 
                    style={{ maxWidth: '100%', maxHeight: '400px' }} 
                    alt="Tournament Result" 
                  />
                </div>
              )}
            </div>
          )}
          
          {tournament.participants && tournament.participants.length > 0 && (
            <div className="mt-4">
              <h5>Participants ({tournament.participants.length})</h5>
              <ul className="list-group">
                {tournament.participants.map((participant, index) => (
                  <li key={index} className="list-group-item">
                    {participant.email}
                    <small className="text-muted ms-2">
                      Joined: {new Date(participant.joinedAt).toLocaleString()}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card.Body>
        <Card.Footer className={`${tournament.status === 'live' ? 'bg-success text-white' : tournament.status === 'completed' ? 'bg-secondary text-white' : ''}`}>
          {tournament.status === 'upcoming' ? 'Registration open' : tournament.status === 'live' ? 'Tournament in progress' : 'Tournament ended'}
        </Card.Footer>
      </Card>
    </Container>
  );
}

export default TournamentDetails;