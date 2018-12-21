## Abstract

We want to have a local address-book that would allow users to keep a list
of name/address pairs, and then use or see names as replacements for addresses
across the wallet UI.

# Iteration 1 (local)

## UI

### Icon

I propose adding a new icon on the top-bar (general idea):

![image](https://user-images.githubusercontent.com/5585355/50343515-3bbc1480-0538-11e9-8b00-4cda202eabf0.png)

Closer view:

![image](https://user-images.githubusercontent.com/5585355/50343528-49719a00-0538-11e9-8bd4-254661abca82.png)

### List

When user clicks on the icon, address book view is open:  

![image](https://user-images.githubusercontent.com/5585355/50344591-ad965d00-053c-11e9-807d-d4e9f8df05c9.png)

The main view contains list of simple pairs: name and address.
Additionally there's a search field at the top, and a button "Add".
When user hovers the cursor over some row - it's highlighted.

### Expanded view

When user clicks some row - it is expanded into something like this:

![image](https://user-images.githubusercontent.com/5585355/50356900-f3671b80-0564-11e9-9811-5a469e6b1aab.png)

Expanded view contains:
1. Additional info (any random text that user can put for each record)
2. Buttons to edit or delete the record

When user clicks row again - it goes back to collapsed view.
If user clicks another row - this one collapses and the clicked one expands.

### Add new record dialog, or Editing a record

When user clicks on the "Add" button - new dialog window appears, kinda like this:

![image](https://user-images.githubusercontent.com/5585355/50357847-6aea7a00-0568-11e9-9e55-e6925400935c.png)

Dialog contains:
1. Text field for "Name"
2. Text field for "Address" 
3. Text area for "Info"
4. Button "Save"

When user clicks "Edit" button on any already existing record -
the same dialog window is opened, but with fields already pre-filled
with information.

### Searching

![image](https://user-images.githubusercontent.com/5585355/50358432-560ee600-056a-11e9-850e-df16089dc7f0.png)

When user enters any text in the search-field - the table of records is filtered
by all names **containing** the entered text (case-insensitive).

### Suggesting

When user starts entering some text into the "Receiver" field -
we search any names in the address-book that **contain** the text (case-insensitive),
and show a suggesting list of possible receivers: 

![image](https://user-images.githubusercontent.com/5585355/50366024-5fa74680-0588-11e9-87f7-ed1a7ef54748.png)

When user either clicks on one of the suggested entries -
we show the associated name next to the address field:  

![image](https://user-images.githubusercontent.com/5585355/50366203-5f5b7b00-0589-11e9-88ef-56e2cf895ca5.png)

**Note:** when user enters/pastes the full address manually - we also search
for an associated entry in the book and show the same result.

**Search rule:** we search any address-book entries where **either**
name **contains** the text **or** address is **case-sensitive-equal**
to the text.

**Note:** search by address might return multiple results.
Then the might be just displayed as a comma-separated list,
or something.  

### Tx History

On the tx history tab, when some tx is expanded -
we can also perform lookup of names associated with tx addresses
in the address book, and display them along the addresses: 

![image](https://user-images.githubusercontent.com/5585355/50366653-080ada00-058c-11e9-9185-ea1519d5b581.png)

On the picture you can see: if some address has associated name, then it's displayed as:
```
Name (smaller address)
```
If not - then just the address is displayed as previously. 

## Technical

# Iteration 2 (sync/export)

## Abstract

Purely local address-book is fragile, because a mere reinstall will destroy it
and cause a full data-loss.

We would like to be able to automatically store the whole address-book
in an external storage, private and owned by user (e.g. Dropbox).

We would also like for user to be able to export the address-book into a file (XML/JSON/CSV?),
and then also to be able to import this file into any other Yoroi,
with **either** merging it into existing address-book, or with completely replacing it. 

## UI

## Technical