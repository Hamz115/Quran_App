# **QuranTrack Academy: Architecture Blueprint**

Version: 2.0 (Multi-User Expansion)  
Date: December 11, 2025  
Status: Approved for Development

## **1\. Executive Summary**

We are expanding **QuranTrack** from a single-user logbook into a **Teacher-Centric Academy Platform**.

The core philosophy shifts from *"One user tracking themselves"* to *"One Teacher managing a Circle (Halaqah) of Students."*

### **Key Principles**

1. **Teacher as Admin:** The teacher controls the flow of data. Classes are created by the teacher and only visible to students when the teacher permits.  
2. **The "Silo" Privacy Doctrine:** Students are strictly isolated. Student A can never see Student B's data, even if they sat in the same physical class.  
3. **Global Mistakes (Per Student):** Mistakes track the *individual*. A mistake marked by a teacher in a formal class—or by a mother in a practice session—must persist in that student's global history.

## **2\. User Roles & Powers**

### **A. The Teacher (The Gatekeeper)**

* **Permissions:**  
  * Create "Group Classes" (Sessions).  
  * View all students linked to them.  
  * Edit/Grade student performance.  
  * "Publish" results to students.  
* **Primary View:** Teacher Dashboard (List of Active Students).

### **B. The Student (The Learner)**

* **Permissions:**  
  * View *only* their own published class history.  
  * View their own "Global Mistake" heat map.  
  * Initiate "Practice Mode" (Self/Family revision).  
* **Primary View:** Student Dashboard (Progress Stats).

### **C. The Helper (Practice Mode / "Mother" Role)**

* **Context:** A non-teacher (e.g., parent) listening to the student.  
* **Mechanism:** Uses the *Student's* logged-in account to run a specific "Practice Session."  
* **Impact:** Mistakes marked here are saved to the Student's global history, warning the teacher in future classes.

## **3\. The "Unified Class" Architecture**

This is the most critical logic update. We are moving from a simple 1-to-1 class model to a **Container Model**.

### **The Concept: "The Box and the Files"**

A "Class" is no longer just a record for one person. It is an **Event** (a box) that contains multiple **Student Records** (files).

#### **1\. The Container (The Event)**

* **What it is:** The physical meeting (e.g., "Tuesday Morning Halaqah").  
* **Owner:** Teacher.  
* **Attributes:** Date, Time, Status (Draft vs. Published).

#### **2\. The Content (Student Entries)**

* **What it is:** The individual grading for each student present.  
* **Entry A:** Ahmed / Surah 92 / 5 Mistakes / "Excellent"  
* **Entry B:** Bilal / Surah 89 / 1 Mistake / "Good"  
* **Entry C:** Zaid / Surah 105 / 0 Mistakes / "Very Good"

**Developer Note:**

* The system must allow a class to have **1** student or **10** students.  
* When "saving" a class, the backend splits this container. Ahmed's entry is linked to Ahmed's ID; Bilal's entry is linked to Bilal's ID.

## **4\. The "Global Mistake" Logic (Multi-User)**

Mistakes must follow the student, not the teacher.

### **The "Personal Layer" Concept**

Imagine the Quran text is a permanent base map. Every student has a transparent "Acetate Layer" of mistakes on top of it.

1. **Teacher Selects Ahmed:**  
   * App loads Quran Base \+ **Ahmed's Mistake Layer**.  
   * *Teacher sees:* Red highlight on "Yalamoon" (Ahmed missed this before).  
2. **Teacher Selects Bilal:**  
   * App **removes** Ahmed's layer.  
   * App loads **Bilal's Mistake Layer**.  
   * *Teacher sees:* "Yalamoon" is clear (Bilal knows it). "Yabsut" is yellow (Bilal missed it).

### **Cross-Pollination (Practice Mode)**

If Ahmed practices with his mother on Tuesday and marks a mistake:

1. That mistake is saved to **Ahmed's Global Layer**.  
2. On Wednesday, when the **Teacher** opens Ahmed's file, they see that mistake highlighted.  
3. **Result:** The teacher is informed of the struggle without needing to ask.

## **5\. Privacy & The "Publishing" Gate**

### **The Invisible Draft**

* **Scenario:** A teacher is conducting a live class.  
* **State:** The class data exists in the database, but is\_published \= FALSE.  
* **Student View:** If Ahmed logs in during his class, he sees **nothing**. The class does not exist for him yet.

### **The Publish Action**

* **Scenario:** Teacher finishes the session.  
* **Action:** Click **"End Class & Publish"**.  
* **System:** Sets is\_published \= TRUE.  
* **Student View:** Ahmed refreshes his app. The class appears.

### **Strict Data Siloing**

* **API Rule:** Every data request from a Student account must be strictly filtered by student\_id.  
* **Constraint:** There is no scenario where Student A's API token can retrieve Student B's records.

## **6\. User Journeys**

### **Journey A: The Group Class (Teacher)**

1. **Setup:** Teacher selects "New Class" $\\rightarrow$ Checks boxes for \[Ahmed, Bilal, Zaid\].  
2. **Interface:** The Classroom opens with a **Student Switcher** (Tabs) at the top.  
3. **Grading Ahmed:**  
   * Teacher clicks "Ahmed" tab.  
   * Ahmed recites. Teacher marks 2 errors.  
   * Teacher rates "Very Good."  
4. **Switching:**  
   * Teacher clicks "Bilal" tab.  
   * **CRITICAL:** The screen instantly refreshes to show *Bilal's* history. Ahmed's marks disappear.  
   * Teacher marks Bilal.  
5. **Completion:** Teacher clicks "Finish". All 3 records are saved.

### **Journey B: The Practice Session (Student/Mother)**

1. **Login:** Student logs in.  
2. **Action:** Clicks **"Start Practice Mode"**.  
3. **Interface:**  
   * Looks exactly like the Teacher view, but strictly for **Self**.  
   * No "Student Switcher" (only me).  
4. **Grading:** Mother marks mistakes.  
5. **Save:** Saved as type: 'practice'.  
6. **Result:** Updates Global Mistakes immediately.

## **7\. Developer Implementation Summary**

### **Database Schema Updates**

1. **users Table:** Add role (Teacher/Student) and teacher\_link.  
2. **classes Table:** Convert to Parent Object. Add is\_published.  
3. **class\_entries Table:** New table linking class\_id, student\_id, and performance.  
4. **mistakes Table:** Add student\_id to the unique constraint.

### **UI Tasks**

1. **Teacher Dashboard:** Create "My Students" list.  
2. **Classroom View:** Build the "Student Switcher" tab system.  
3. **Login Logic:** Direct Teacher to Admin Panel, Student to Personal Dashboard.