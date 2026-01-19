# **Logical Architecture Blueprint: User Identity & Relationships**

Project: QuranTrack Academy  
Goal: Define the logical behavior of user accounts, role switching, and monetization without technical jargon.

## **1\. The Core Philosophy: "Identity vs. Capability"**

In this system, we do not separate users into different "species" (like a separate app for teachers and students). Instead, everyone is a **User**.

Think of it like a video game:

* **Level 1 (Basic):** Everyone starts here. You can play the game (view progress, practice).  
* **Level 2 (Pro):** You unlock this by proving who you are (Verification). This grants you "Admin Powers" (creating classes, adding others).

### **The Golden Rule of Roles**

* **Student (Basic):** A participant. They consume content and track their own practice.  
* **Teacher (Pro):** A manager. They create content, manage others, and pay for the service.

## **2\. The Two Roles Explained**

### **Role A: The Basic User (Student)**

* **Entry Speed:** Instant. No barriers. They enter a username/password and they are in.  
* **Cost:** $0.00 Forever.  
* **The Limitation:** They act like a "Ghost" to others. They cannot invite anyone. They cannot see anyone else. They exist in their own private bubble unless a Teacher adds them.  
* **Primary Action:** "Practice Mode" (Self-Revision).

### **Role B: The Pro User (Teacher)**

* **Entry Speed:** Gated. Requires "Proof of Identity" (Email Verification).  
* **Cost:** Freemium (Free for small circles, Paid for professionals).  
* **The Power:** They act as "Hubs." They connect other users to themselves.  
* **Primary Action:** "Formal Class" (Grading others).

## **3\. The "Upgrade" Logic (The Verification Gate)**

How does a User go from Basic to Pro?

1. **The Trigger:** A Basic User decides, "I want to teach my brother."  
2. **The Barrier:** The system says, "To manage others, we need to know you are a real person. Please verify your email."  
3. **The Crossing:** The user verifies their email.  
4. **The Result:** The system flips a switch on their account. They now see the "Add Student" button.

**Why this matters:**

* It keeps the Student signup incredibly fast (no email fatigue).  
* It ensures that "Teachers" (who act as admins) are responsible, verified entities.

## **4\. The Fluid Relationship Model (Teacher as Student)**

This is the most critical logic for your "Sister teaching Brother" scenario.

**The Logic:** "Teacher" is just a set of tools, not a permanent label.

* **Scenario:** You are a Verified Teacher.  
* **Morning:** You open your dashboard. You see your list of students. You click "Ahmed" and give him a lesson. **(You are the Teacher)**.  
* **Evening:** You go to your friend Sheikh Bilal's house. He adds *you* to his list. He gives *you* a lesson. **(You are the Student)**.

**The Rule:** A Verified Teacher retains the ability to be a Student. They simply exist in someone else's list while managing their own list.

## **5\. The Monetization Logic (Who Pays?)**

We follow the **"Manager Pays"** model.

* **The Student Logic:** Students are passive. They just show up. Charging them creates friction ("I want to learn Quran, why do I have to pay?"). We keep them free to encourage growth.  
* **The Teacher Logic:** Teachers are active managers. They use the app to organize their work, track history, and save time.  
  * *Small Teachers (Family):* If you teach \< 3 people, it's a hobby. Free.  
  * *Big Teachers (Schools):* If you teach \> 3 people, it's a job/service. Paid.

**Conclusion:** The User who *holds the roster* pays for the privilege of managing that roster.

## **6\. The Notification Logic (The "Admin Pulse")**

Since you are the developer and owner, you need a pulse on the system.

**The Logic:**

* Every time a **New Account** is created (Basic or Pro), the system silently taps you on the shoulder (Email/Notification).  
* Every time a **Teacher Verifies**, the system flags this as a "High Value Event" (potential customer).

This allows you to manually monitor growth without needing to build a complex admin dashboard right away.

## **Summary of Rules**

1. **Students** \= Instant Access, Free, Read-Only.  
2. **Teachers** \= Verified Access, Admin Powers, Potential Payers.  
3. **Upgrade Path** \= Any Student can become a Teacher by verifying email.  
4. **Fluidity** \= A Teacher can be a Student in another Teacher's class.  
5. **Privacy** \= Students can NEVER see who else their Teacher is teaching.