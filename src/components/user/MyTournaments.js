import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Button } from 'react-bootstrap';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import TournamentStatusService from '../../services/TournamentStatusService';
import { useNavigate } from 'react-router-dom';

function MyTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Fetch user's tournaments on component mount
  useEffect(() => {
    if (currentUser) {
      fetchMyTournaments();
    }
  }, [currentUser]);

  async function fetchMyTournaments() {
    try {
      setLoading(true);
      
      // Check and update tournament statuses before fetching
      await TournamentStatusService.checkAndUpdateTournamentStatuses();
      
      const tournamentsCollection = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      
      // Filter tournaments where the current user is a participant
      const myTournaments = tournamentsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(tournament => 
          tournament.participants?.some(p => p.userId === currentUser.uid)
        );
      
      // Sort tournaments by date (newest first)
      myTournaments.sort((a, b) => {
        const dateA = a.tournamentDate?.toDate ? a.tournamentDate.toDate() : new Date();
        const dateB = b.tournamentDate?.toDate ? b.tournamentDate.toDate() : new Date();
        return dateB - dateA;
      });
      
      setTournaments(myTournaments);
    } catch (error) {
      setError('Failed to fetch tournaments: ' + error.message);
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

  return (
    <Container className="py-5">
      <h1 className="mb-4">My Tournaments</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <p>Loading your tournaments...</p>
      ) : (
        <Row>
          {tournaments.length === 0 ? (
            <Col>
              <Alert variant="info">You haven&apos;t joined any tournaments yet.</Alert>
            </Col>
          ) : (
            tournaments.map(tournament => (
              <Col key={tournament.id} lg={4} md={6} className="mb-4">
                <Card>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <Badge bg={getStatusBadgeVariant(tournament.status)}>
                      {tournament.status.toUpperCase()}
                    </Badge>
                    <span>{tournament.gameType}</span>
                  </Card.Header>
                  <Card.Body>
                    <Card.Title>{tournament.gameName}</Card.Title>
                    <Card.Text>
                      <strong>Date & Time:</strong> {tournament.tournamentDate?.toDate 
                        ? tournament.tournamentDate.toDate().toLocaleDateString() 
                        : 'N/A'} {tournament.tournamentTime || ''}
                      <br />
                      <strong>Entry Fee:</strong> ${tournament.entryFee}
                      <br />
                      <strong>Prize Pool:</strong> ${tournament.prizePool}
                      <br />
                      <strong>Participants:</strong> {tournament.participants?.length || 0} / {tournament.maxParticipants}
                    </Card.Text>
                    
                    {tournament.status === 'upcoming' && !tournament.matchDetails && (
                      <div className="alert alert-info mt-3 mb-0">
                        <small>
                          <strong>Note:</strong> Tournament details will be updated closer to the start time.
                        </small>
                      </div>
                    )}
                    
                    {tournament.status === 'upcoming' && tournament.matchDetails && (
                      <div className="alert alert-info mt-3 mb-0">
                        <small>
                          <strong>Match Details:</strong><br />
                          {tournament.matchDetails}
                        </small>
                      </div>
                    )}
                    
                    {tournament.status === 'live' && tournament.matchDetails && (
                      <div className="alert alert-success mt-3 mb-0">
                        <small>
                          <strong>Match Details:</strong><br />
                          {tournament.matchDetails}
                        </small>
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <Button 
                        variant="outline-info" 
                        onClick={() => navigate(`/tournaments/${tournament.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </Card.Body>
                  <Card.Footer className={`${tournament.status === 'live' ? 'bg-success text-white' : tournament.status === 'completed' ? 'bg-secondary text-white' : ''}`}>
                    {tournament.status === 'upcoming' ? 'Registration open' : tournament.status === 'live' ? 'Tournament in progress' : 'Tournament ended'}
                  </Card.Footer>
                </Card>
              </Col>
            ))
          )}
        </Row>
      )}
    </Container>
  );
}

export default MyTournaments;