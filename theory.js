// deploying our app using aws

// why do we need a ngnix in we are deploying our fe and be application in ec2 instance ?
// explain in layman and detail terms
// Nginx is a powerful web server that can also function as a reverse proxy,
//  load balancer, and HTTP cache. When deploying a frontend (FE) and backend (BE) 
// application on an EC2 instance, Nginx can be used to manage incoming traffic 
// and route requests to the appropriate application.
// In layman's terms, Nginx acts as a traffic controller for your applications.
//  It listens for incoming requests from users and directs them to the correct 
// application based on the URL or other criteria. This allows you to run both your
//  frontend and backend applications on the same EC2 instance without conflicts. 

// so we have a our application is itself a server which is on a server ngnix?
// Yes, that's correct. When you deploy your frontend and backend applications 
// on an EC2 instance, they are essentially running as servers on that instance.
//  Nginx can be used to manage the traffic between these applications and 
// the users accessing them. It can route requests to the appropriate application
//  based on the URL or other criteria, allowing both applications to coexist
//  on the same server without conflicts. Nginx can also provide additiona
// l features such as load balancing, SSL termination, and caching to improve the
//  performance and security of your applications.

// expalin me what does pm2 does ?
// PM2 is a process manager for Node.js applications that allows you to keep your
//  applications running in the background, manage multiple processes, 
// and monitor their performance. It provides features such as automatic restarts,
//  load balancing, log management, and process monitoring. PM2 can be used to run 
// Node.js applications in production environments, ensuring that they remain available 
// and responsive even in the event of crashes or errors. It also provides a 
// command-line interface and a web-based dashboard for managing and monitoring your
//  applications. Overall, PM2 is a powerful tool for managing Node.js applications
//  in production environments.

// give me a detailed summaery of ngnix proxy passing and how it works ?
// Nginx is a popular web server that can also be used as a reverse proxy server.
//  A reverse proxy is a server that sits between client devices and backend servers, 
// forwarding client requests to the appropriate backend server and returning the server's
//  response to the client. Nginx proxy passing is a feature that allows Nginx
//  to forward incoming requests to another server or service.      


// When a client makes a request to the Nginx server, 
// Nginx can be configured to pass that request to a backend server
//  (such as an application server) using the proxy_pass directive
// . This allows Nginx to act as an intermediary between the client 
// and the backend server, providing benefits such as load balancing, 
// caching, SSL termination, and security.
// The process of Nginx proxy passing works as follows:
// 1. Client Request: A client (such as a web browser) sends an HTTP request'
//  to the Nginx server.
// 2. Nginx Configuration: Nginx is configured with a server block that 
// specifies the location of the backend server to which requests should be forwarded.
//  This is done using the proxy_pass directive in the Nginx configuration file.
// 3. Request Forwarding: When Nginx receives the client's request,
//  it forwards the request to the specified backend server using the proxy_pass directive
// . Nginx can also modify the request headers, such as adding or removing headers, 
// before forwarding the request.
// 4. Backend Server Response: The backend server processes the request and generates 
// a response, which is sent back to the Nginx server.
// 5. Response Forwarding: Nginx receives the response from the backend 
// server and forwards it back to the client. 
// Nginx can also modify the response headers or content before sending it to the client.
// 6. Client Receives Response: The client receives the response from Nginx,
//  which appears as if it came directly from the backend server.  
// Nginx proxy passing provides several benefits, including:
// - Load Balancing: Nginx can distribute incoming requests across multiple backend servers, improving performance and reliability.
// - Caching: Nginx can cache responses from backend servers, reducing the load on those servers and improving response times for clients.
// - SSL Termination: Nginx can handle SSL/TLS encryption and decryption, allowing backend servers to focus on processing requests without the overhead of encryption.
// - Security: Nginx can provide additional security features, such as filtering requests, blocking malicious traffic, and protecting against DDoS attacks.
// Overall, Nginx proxy passing is a powerful feature that allows Nginx to act as a reverse proxy server, providing various benefits for web applications and services. 


