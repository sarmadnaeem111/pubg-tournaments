import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Alert, Modal, Form } from 'react-bootstrap';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import TournamentStatusService from '../../services/TournamentStatusService';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const { currentUser, getUserData } = useAuth();
  const navigate = useNavigate();

  // Fetch tournaments and user data on component mount
  useEffect(() => {
    fetchTournaments();
    if (currentUser) {
      fetchUserWalletBalance();
    }
  }, [currentUser]);

  async function fetchTournaments() {
    try {
      setLoading(true);
      
      // Check and update tournament statuses before fetching
      await TournamentStatusService.checkAndUpdateTournamentStatuses();
      
      const tournamentsCollection = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      const tournamentsList = tournamentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Check if current user has joined this tournament
        hasJoined: currentUser ? 
          doc.data().participants?.some(p => p.userId === currentUser.uid) : 
          false
      }));
      
      // Sort tournaments: upcoming first, then live, then completed
      tournamentsList.sort((a, b) => {
        const statusOrder = { 'upcoming': 0, 'live': 1, 'completed': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
      
      setTournaments(tournamentsList);
    } catch (error) {
      setError('Failed to fetch tournaments: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserWalletBalance() {
    try {
      const userData = await getUserData(currentUser.uid);
      if (userData) {
        setWalletBalance(userData.walletBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  }

  function openJoinModal(tournament) {
    setCurrentTournament(tournament);
    setUsername('');
    setUsernameError('');
    setShowJoinModal(true);
  }

  async function handleJoinTournament() {
    if (!currentUser || !currentTournament) return;

    try {
      // Validate username
      if (!username.trim()) {
        setUsernameError('Username is required');
        return;
      }
      
      // Sanitize username input
      const sanitizedUsername = DOMPurify.sanitize(username.trim());
      
      // Validate username length and characters
      if (sanitizedUsername.length < 3 || sanitizedUsername.length > 20) {
        setUsernameError('Username must be between 3 and 20 characters');
        return;
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
        setUsernameError('Username can only contain letters, numbers, and underscores');
        return;
      }

      // Check if user has enough balance
      if (walletBalance < currentTournament.entryFee) {
        setError('Insufficient wallet balance');
        return;
      }

      // Check if tournament is full
      if (currentTournament.participants?.length >= currentTournament.maxParticipants) {
        setError('Tournament is full');
        return;
      }

      // Update user's wallet balance
      const userRef = doc(db, 'users', currentUser.uid);
      const newBalance = walletBalance - currentTournament.entryFee;
      
      await updateDoc(userRef, {
        walletBalance: newBalance,
        joinedTournaments: arrayUnion(currentTournament.id)
      });

      // Add user to tournament participants
      const tournamentRef = doc(db, 'tournaments', currentTournament.id);
      await updateDoc(tournamentRef, {
        participants: arrayUnion({
          userId: currentUser.uid,
          email: currentUser.email,
          username: sanitizedUsername,
          joinedAt: new Date().toISOString()
        })
      });

      // Update local state
      setWalletBalance(newBalance);
      fetchTournaments();
      setShowJoinModal(false);
    } catch (error) {
      setError('Failed to join tournament: ' + error.message);
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Tournaments</h1>
        {currentUser && (
          <div className="text-end">
            <h5>Wallet Balance: <span className="text-success">${walletBalance}</span></h5>
          </div>
        )}
      </div>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      
      {loading ? (
        <p>Loading tournaments...</p>
      ) : (
        <Row>
          {tournaments.length === 0 ? (
            <Col>
              <Alert variant="info">No tournaments available at the moment.</Alert>
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
                    
                    {tournament.status === 'live' && tournament.matchDetails && (
                      <div className="alert alert-success mt-3 mb-0">
                        <small>
                          <strong>Match Details:</strong><br />
                          {tournament.matchDetails}
                        </small>
                      </div>
                    )}
                    
                    {tournament.status === 'upcoming' && tournament.hasJoined && tournament.matchDetails && (
                      <div className="alert alert-info mt-3 mb-0">
                        <small>
                          <strong>Match Details:</strong><br />
                          {tournament.matchDetails}
                        </small>
                      </div>
                    )}
                    
                    <div className="d-flex flex-column gap-2">
                      {currentUser ? (
                        tournament.hasJoined ? (
                          <Button variant="outline-success" disabled>
                            Already Joined
                          </Button>
                        ) : (
                          <Button 
                            variant="primary" 
                            disabled={tournament.status !== 'upcoming' || tournament.participants?.length >= tournament.maxParticipants}
                            onClick={() => openJoinModal(tournament)}
                          >
                            Join Tournament
                          </Button>
                        )
                      ) : (
                        <Button variant="primary" disabled>
                          Login to Join
                        </Button>
                      )}
                      
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
      
      {/* Join Tournament Modal */}
      <Modal show={showJoinModal} onHide={() => setShowJoinModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Join Tournament</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentTournament && (
            <Form>
              <p><strong>{currentTournament.gameName}</strong></p>
              <p>Are you sure you want to join this tournament?</p>
              
              <Form.Group className="mb-3">
                <Form.Label>Entry Fee</Form.Label>
                <Form.Control 
                  type="text" 
                  value={`$${currentTournament.entryFee}`} 
                  disabled 
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Your Wallet Balance</Form.Label>
                <Form.Control 
                  type="text" 
                  value={`$${walletBalance}`} 
                  disabled 
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Balance After Joining</Form.Label>
                <Form.Control 
                  type="text" 
                  value={`$${walletBalance - currentTournament.entryFee}`} 
                  disabled 
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Game Username <span className="text-danger">*</span></Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter your in-game username" 
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError('');
                  }}
                  isInvalid={!!usernameError}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {usernameError}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  This is the username that will be used to identify you in the tournament.
                </Form.Text>
              </Form.Group>
              
              {walletBalance < currentTournament.entryFee && (
                <Alert variant="danger">
                  Insufficient balance. Please add funds to your wallet.
                </Alert>
              )}
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowJoinModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleJoinTournament}
            disabled={!currentTournament || walletBalance < currentTournament.entryFee}
          >
            Confirm & Join
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default TournamentList;