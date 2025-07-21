import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, ListGroup, Badge } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

function UserProfile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser, getUserData } = useAuth();

  useEffect(() => {
    async function fetchUserData() {
      if (currentUser) {
        try {
          const data = await getUserData(currentUser.uid);
          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    }

    fetchUserData();
  }, [currentUser, getUserData]);

  if (loading) {
    return <Container className="py-5"><p>Loading profile...</p></Container>;
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">My Profile</h1>
      
      <Row>
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <div className="text-center mb-3">
                <div 
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto" 
                  style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}
                >
                  {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              
              <Card.Title className="text-center">{currentUser?.email}</Card.Title>
              <Card.Text className="text-center text-muted">
                <Badge bg="secondary">{userData?.role || 'User'}</Badge>
              </Card.Text>
              
              <ListGroup variant="flush" className="mt-4">
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <span>Wallet Balance</span>
                  <span className="text-success fw-bold">${userData?.walletBalance || 0}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <span>Joined Tournaments</span>
                  <span>{userData?.joinedTournaments?.length || 0}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <span>Account Created</span>
                  <span>{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</span>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Account Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <h6>Email Address</h6>
                  <p>{currentUser?.email}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <h6>User ID</h6>
                  <p className="text-muted">{currentUser?.uid}</p>
                </Col>
              </Row>
              
              <hr />
              
              <h6>Wallet Information</h6>
              <p>
                Your current balance is <strong className="text-success">${userData?.walletBalance || 0}</strong>.
                This balance can be used to join tournaments. Contact the admin to add funds to your wallet.
              </p>
              
              <hr />
              
              <h6>Tournament History</h6>
              {userData?.joinedTournaments?.length > 0 ? (
                <p>You have joined {userData.joinedTournaments.length} tournaments. View details in the My Tournaments section.</p>
              ) : (
                <p>You haven&apos;t joined any tournaments yet. Check out the Tournaments section to find and join upcoming events.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default UserProfile;