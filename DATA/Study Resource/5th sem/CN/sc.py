import os
import comtypes.client

def convert_ppt_to_pdf(input_folder):
    # Create a PowerPoint application object
    powerpoint = comtypes.client.CreateObject("PowerPoint.Application")
    powerpoint.Visible = 1

    # Walk through the directory and its subdirectories
    for root, dirs, files in os.walk(input_folder):
        for file in files:
            if file.endswith((".ppt", ".pptx")):
                full_path = os.path.join(root, file)
                print(f"Processing {full_path} ...")
                
                # Open the PowerPoint file
                presentation = powerpoint.Presentations.Open(full_path)
                
                # Create a name for the PDF document
                pdf_filename = os.path.join(input_folder, f"{os.path.splitext(file)[0]}.pdf")
                
                # Save as PDF
                presentation.SaveAs(pdf_filename, 32)  # 32 is the literal value for ppSaveAsPDF
                
                # Close the PowerPoint file
                presentation.Close()
    
    # Quit the PowerPoint application
    powerpoint.Quit()

if __name__ == "__main__":
    # Get the current working directory
    curr_path = os.getcwd()
    convert_ppt_to_pdf(curr_path)