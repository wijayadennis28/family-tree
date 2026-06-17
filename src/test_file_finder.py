import os

# Simple demonstration of the file finding functionality
def demo_find_files():
    """Demonstrate how to find files in current directory"""
    
    # Get current working directory
    current_dir = "."
    
    print(f"Searching in: {os.path.abspath(current_dir)}")
    print("Files found:")
    
    try:
        count = 0
        for root, dirs, files in os.walk(current_dir):
            # Skip common directories we don't want to include
            dirs[:] = [d for d in dirs if not any(pattern in d for pattern in ['.git', '__pycache__', '.svn'])]
            
            for file in files:
                # Skip common file types we don't want to include
                if not any(pattern in file for pattern in ['.pyc', '.pyo', '.pyd']):
                    full_path = os.path.join(root, file)
                    print(f"  {full_path}")
                    count += 1
        
        print(f"\nTotal files found: {count}")
        
    except Exception as e:
        print(f"Error during search: {e}")

if __name__ == "__main__":
    demo_find_files()